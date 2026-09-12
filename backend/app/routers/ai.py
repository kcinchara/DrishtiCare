import os
import cv2
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models import (
    Screening, QualityAssessment, Enhancement, AIResult,
    LesionResult, VesselResult, Explanation, TriageResult
)
from app.schemas import (
    ImageQualityRequest, ImageQualityResponse,
    EnhancementRequest, EnhancementResponse,
    DRClassificationRequest, DRClassificationResponse,
    VesselSegmentationRequest, VesselSegmentationResponse,
    LesionDetectionRequest, LesionDetectionResponse,
    DMERiskRequest, DMERiskResponse,
    ExplainabilityRequest, ExplainabilityResponse,
    PipelineAnalysisRequest, PipelineAnalysisResponse,
    ModelEvaluationResponse,
    StitchRequest, StitchResponse
)
from app.services.state_machine import ScreeningState
from app.services.audit_service import AuditService
from app.services.evaluator import ModelEvaluator
from app.ai.quality.service import ImageQualityAssessmentService
from app.ai.preprocessing.service import ImageEnhancementService
from app.ai.preprocessing.stitcher import FundusStitcher
from app.utils.sample_generator import generate_synthetic_fundus
from app.ai.dr_classifier.model import DemoDRModel
from app.ai.lesion_detector.model import DemoLesionModel
from app.ai.vessel_segmenter.model import DemoVesselModel
from app.ai.dme_detector.model import DemoDMEModel
from app.ai.explainability.service import DemoExplainabilityModel
from app.ai.orchestrator import orchestrator

router = APIRouter(prefix="/ai", tags=["AI & Image Processing"])

def get_screening_and_image(screening_id: int, db: Session):
    screening = db.query(Screening).filter(Screening.id == screening_id).first()
    if not screening:
        raise HTTPException(status_code=404, detail="Screening not found")
    if not screening.retinal_image:
        raise HTTPException(status_code=400, detail="No retinal image uploaded for this screening.")
    return screening, screening.retinal_image

@router.post("/image-quality", response_model=ImageQualityResponse)
def assess_image_quality(req: ImageQualityRequest, db: Session = Depends(get_db)):
    screening, img_record = get_screening_and_image(req.screening_id, db)
    
    result = ImageQualityAssessmentService.assess_quality(img_record.original_path)
    
    # Save or update quality assessment
    db_fields = {k: v for k, v in result.items() if hasattr(QualityAssessment, k)}
    qa = db.query(QualityAssessment).filter(QualityAssessment.screening_id == screening.id).first()
    if not qa:
        qa = QualityAssessment(screening_id=screening.id, **db_fields)
        db.add(qa)
    else:
        for k, v in db_fields.items():
            setattr(qa, k, v)
                
    screening.status = ScreeningState.QUALITY_CHECKED
    db.commit()
    db.refresh(qa)
    
    AuditService.log_event(
        db=db,
        screening_id=screening.id,
        user_role="HEALTHCARE_WORKER",
        user_name="Quality Gate",
        action="EVALUATED_IMAGE_QUALITY",
        new_value=f"{result['overall_score']}% ({result['status']})",
        details=f"Reasons: {', '.join(result['reasons']) if result['reasons'] else 'None'}"
    )
    
    return result

@router.post("/enhance", response_model=EnhancementResponse)
def enhance_image(req: EnhancementRequest, db: Session = Depends(get_db)):
    screening, img_record = get_screening_and_image(req.screening_id, db)
    
    try:
        enh_data = ImageEnhancementService.enhance_image(
            image_path=img_record.original_path,
            output_prefix=f"{screening.screening_id}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Enhancement error: {str(e)}")

    enh = db.query(Enhancement).filter(Enhancement.screening_id == screening.id).first()
    if not enh:
        enh = Enhancement(
            screening_id=screening.id,
            enhanced_path=enh_data["enhanced_path"],
            clahe_applied=enh_data["clahe_applied"],
            illumination_normalized=enh_data["illumination_normalized"],
            noise_reduced=enh_data["noise_reduced"],
            contrast_enhanced=enh_data["contrast_enhanced"],
            quality_status=enh_data["quality_status"],
            metadata_info=enh_data["metadata_info"]
        )
        db.add(enh)
    else:
        enh.enhanced_path = enh_data["enhanced_path"]
        enh.quality_status = enh_data["quality_status"]
        enh.metadata_info = enh_data["metadata_info"]

    screening.status = ScreeningState.PREPROCESSED
    db.commit()

    AuditService.log_event(
        db=db,
        screening_id=screening.id,
        user_role="HEALTHCARE_WORKER",
        user_name="Enhancement Engine",
        action="APPLIED_CLAHE_ENHANCEMENT",
        new_value="Improved",
        details="Color space LAB, bilateral denoising, illumination normalization"
    )

    return {
        "enhanced_image_url": f"/media/enhanced/{os.path.basename(enh_data['enhanced_path'])}",
        "original_image_url": f"/media/uploads/{img_record.filename}",
        "clahe_applied": enh_data["clahe_applied"],
        "illumination_normalized": enh_data["illumination_normalized"],
        "noise_reduced": enh_data["noise_reduced"],
        "contrast_enhanced": enh_data["contrast_enhanced"],
        "quality_status": enh_data["quality_status"],
        "processing_metadata": enh_data["metadata_info"]
    }

@router.post("/classify-dr", response_model=DRClassificationResponse)
def classify_dr(req: DRClassificationRequest, db: Session = Depends(get_db)):
    screening, img_record = get_screening_and_image(req.screening_id, db)
    
    # Pre-classification Quality Gate
    quality_res = ImageQualityAssessmentService.assess_quality(img_record.original_path)
    if not quality_res.get("is_suitable_for_ai", True) or quality_res.get("overall_score", 0) < 55.0:
        return {
            "grade": 0,
            "prediction": 0,
            "label": "Poor Quality — Repeat fundus image",
            "confidence": 0.0,
            "probabilities": {f"DR{i}": 0.0 for i in range(5)},
            "model_version": "DrishtiCare-DR-v2",
            "is_referable": False,
            "image_quality": "Poor",
            "quality_result": "Repeat fundus image"
        }

    img = cv2.imread(img_record.original_path)
    dr_model = DemoDRModel()
    pred = dr_model.predict(img, image_name=os.path.basename(img_record.original_path))
    return {
        "grade": pred.grade,
        "prediction": pred.grade,
        "label": pred.label,
        "confidence": pred.confidence,
        "probabilities": pred.probabilities,
        "model_version": pred.model_version,
        "is_referable": pred.is_referable,
        "image_quality": "Good",
        "quality_result": "Acceptable for AI"
    }

@router.post("/segment-vessels", response_model=VesselSegmentationResponse)
def segment_vessels(req: VesselSegmentationRequest, db: Session = Depends(get_db)):
    screening, img_record = get_screening_and_image(req.screening_id, db)
    img = cv2.imread(img_record.original_path)
    model = DemoVesselModel()
    res = model.segment(img, output_prefix=f"{screening.screening_id}_vessel")
    return {
        "vessel_visibility": res.vessel_visibility,
        "mask_url": f"/media/explanations/{os.path.basename(res.mask_path)}",
        "overlay_url": f"/media/explanations/{os.path.basename(res.overlay_path)}",
        "model_version": res.model_version
    }

@router.post("/detect-lesions", response_model=LesionDetectionResponse)
def detect_lesions(req: LesionDetectionRequest, db: Session = Depends(get_db)):
    screening, img_record = get_screening_and_image(req.screening_id, db)
    img = cv2.imread(img_record.original_path)
    model = DemoLesionModel()
    res = model.detect(img, output_prefix=f"{screening.screening_id}_lesion")
    return {
        "microaneurysms": res.microaneurysms,
        "hemorrhages": res.hemorrhages,
        "hard_exudates": res.hard_exudates,
        "soft_exudates": res.soft_exudates,
        "lesion_map_url": f"/media/explanations/{os.path.basename(res.lesion_map_path)}",
        "confidence": res.confidence,
        "detections": res.detections,
        "model_version": res.model_version
    }

@router.post("/dme-risk", response_model=DMERiskResponse)
def assess_dme_risk(req: DMERiskRequest, db: Session = Depends(get_db)):
    screening, img_record = get_screening_and_image(req.screening_id, db)
    img = cv2.imread(img_record.original_path)
    model = DemoDMEModel()
    res = model.assess(img)
    return {
        "risk": res.risk,
        "confidence": res.confidence,
        "explanation": res.explanation,
        "model_version": res.model_version
    }

@router.post("/explain", response_model=ExplainabilityResponse)
def generate_explanation(req: ExplainabilityRequest, db: Session = Depends(get_db)):
    screening, img_record = get_screening_and_image(req.screening_id, db)
    img = cv2.imread(img_record.original_path)
    
    dr_model = DemoDRModel()
    dr_out = dr_model.predict(img)
    
    lesion_model = DemoLesionModel()
    lesion_out = lesion_model.detect(img, output_prefix=f"{screening.screening_id}_lesion")
    
    vessel_model = DemoVesselModel()
    vessel_out = vessel_model.segment(img, output_prefix=f"{screening.screening_id}_vessel")
    
    xai_model = DemoExplainabilityModel()
    xai_out = xai_model.generate_explanation(
        image=img,
        dr_output=dr_out,
        lesion_output=lesion_out,
        vessel_output=vessel_out,
        output_prefix=f"{screening.screening_id}_xai"
    )
    
    return {
        "gradcam_url": f"/media/explanations/{os.path.basename(xai_out.gradcam_path)}",
        "overlay_url": f"/media/explanations/{os.path.basename(xai_out.overlay_path)}",
        "lesion_map_url": f"/media/explanations/{os.path.basename(xai_out.lesion_map_path)}",
        "vessel_map_url": f"/media/explanations/{os.path.basename(xai_out.vessel_map_path)}",
        "combined_url": f"/media/explanations/{os.path.basename(xai_out.combined_path)}",
        "reasoning_summary": xai_out.reasoning_summary,
        "model_version": xai_out.model_version
    }

@router.post("/stitch", response_model=StitchResponse)
def stitch_dual_fields(req: StitchRequest, db: Session = Depends(get_db)):
    screening, img_record = get_screening_and_image(req.screening_id, db)
    
    # Field 1: Primary active image (Macula-centered)
    img1_path = img_record.original_path

    # Field 2: Optic Disc-centered field
    grade = req.sample_field_grade if req.sample_field_grade is not None else 2
    disc_sample_path = generate_synthetic_fundus(
        grade=grade,
        filename=f"field2_disc_sample_{grade}.jpg",
        field_center="disc"
    )

    try:
        result = FundusStitcher.stitch_fields(
            img1_input=img1_path,
            img2_input=disc_sample_path,
            output_prefix=f"{screening.screening_id}_mosaic"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image stitching failed: {str(e)}")

    # Update screening's primary retinal image with the stitched mosaic
    img_record.original_path = result["stitched_path"]
    img_record.filename = os.path.basename(result["stitched_path"])
    img_record.width = result["mosaic_width"]
    img_record.height = result["mosaic_height"]
    db.commit()

    AuditService.log_event(
        db=db,
        screening_id=screening.id,
        user_role="HEALTHCARE_WORKER",
        user_name="Retinal Stitcher",
        action="STITCHED_DUAL_FIELDS",
        new_value=f"Panoramic Mosaic ({result['mosaic_width']}x{result['mosaic_height']})",
        details=f"Method: {result['method']}, Aligned Points: {result['matches_aligned']}"
    )

    return result

@router.post("/analyze")
def run_pipeline(req: PipelineAnalysisRequest, db: Session = Depends(get_db)):
    screening, img_record = get_screening_and_image(req.screening_id, db)
    
    # Run full orchestration with requested accuracy mode (enhanced by default)
    accuracy_mode = req.accuracy_mode or "enhanced"
    try:
        output = orchestrator.run_full_pipeline(
            img_record.original_path,
            screening.screening_id,
            accuracy_mode=accuracy_mode
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    
    # 1. Quality Assessment DB record
    q_data = output["quality"]
    qa_fields = {k: v for k, v in q_data.items() if hasattr(QualityAssessment, k)}
    qa = db.query(QualityAssessment).filter(QualityAssessment.screening_id == screening.id).first()
    if not qa:
        qa = QualityAssessment(screening_id=screening.id, **qa_fields)
        db.add(qa)
    else:
        for k, v in qa_fields.items():
            setattr(qa, k, v)
                
    # 2. AI Result DB record
    dr_data = output["dr_classification"]
    dme_data = output["dme_risk"]
    ai = db.query(AIResult).filter(AIResult.screening_id == screening.id).first()
    if not ai:
        ai = AIResult(
            screening_id=screening.id,
            dr_grade=dr_data["grade"],
            label=dr_data["label"],
            confidence=dr_data["confidence"],
            probabilities=dr_data["probabilities"],
            model_version=dr_data["model_version"],
            is_demo=True,
            is_referable=dr_data["is_referable"],
            dme_risk=dme_data["risk"],
            dme_confidence=dme_data["confidence"],
            dme_explanation=dme_data["explanation"]
        )
        db.add(ai)
    else:
        ai.dr_grade = dr_data["grade"]
        ai.label = dr_data["label"]
        ai.confidence = dr_data["confidence"]
        ai.probabilities = dr_data["probabilities"]
        ai.is_referable = dr_data["is_referable"]
        ai.dme_risk = dme_data["risk"]
        ai.dme_confidence = dme_data["confidence"]
        ai.dme_explanation = dme_data["explanation"]

    # 3. Lesion Result DB record
    les_data = output["lesions"]
    les = db.query(LesionResult).filter(LesionResult.screening_id == screening.id).first()
    if not les:
        les = LesionResult(
            screening_id=screening.id,
            microaneurysms=les_data["microaneurysms"],
            hemorrhages=les_data["hemorrhages"],
            hard_exudates=les_data["hard_exudates"],
            soft_exudates=les_data["soft_exudates"],
            lesion_map_path=les_data["lesion_map_path"],
            detections=les_data["detections"],
            confidence=les_data["confidence"],
            model_version=les_data["model_version"]
        )
        db.add(les)
    else:
        les.microaneurysms = les_data["microaneurysms"]
        les.hemorrhages = les_data["hemorrhages"]
        les.hard_exudates = les_data["hard_exudates"]
        les.soft_exudates = les_data["soft_exudates"]
        les.lesion_map_path = les_data["lesion_map_path"]
        les.detections = les_data["detections"]

    # 4. Vessel Result DB record
    ves_data = output["vessels"]
    ves = db.query(VesselResult).filter(VesselResult.screening_id == screening.id).first()
    if not ves:
        ves = VesselResult(
            screening_id=screening.id,
            vessel_visibility=ves_data["vessel_visibility"],
            mask_path=ves_data["mask_path"],
            overlay_path=ves_data["overlay_path"],
            model_version=ves_data["model_version"]
        )
        db.add(ves)
    else:
        ves.vessel_visibility = ves_data["vessel_visibility"]
        ves.mask_path = ves_data["mask_path"]
        ves.overlay_path = ves_data["overlay_path"]

    # 5. Explanation DB record
    xai_data = output["explainability"]
    xai = db.query(Explanation).filter(Explanation.screening_id == screening.id).first()
    if not xai:
        xai = Explanation(
            screening_id=screening.id,
            gradcam_path=xai_data["gradcam_path"],
            overlay_path=xai_data["overlay_path"],
            combined_path=xai_data["combined_path"],
            reasoning_summary=xai_data["reasoning_summary"],
            model_version=xai_data["model_version"]
        )
        db.add(xai)
    else:
        xai.gradcam_path = xai_data["gradcam_path"]
        xai.overlay_path = xai_data["overlay_path"]
        xai.combined_path = xai_data["combined_path"]
        xai.reasoning_summary = xai_data["reasoning_summary"]

    # Update screening state to RESULT_READY
    screening.status = ScreeningState.RESULT_READY
    db.commit()

    AuditService.log_event(
        db=db,
        screening_id=screening.id,
        user_role="AI_ENGINE",
        user_name="AI Pipeline",
        action="EXECUTED_PIPELINE",
        new_value=f"Grade {dr_data['grade']} ({dr_data['label']})",
        details=f"Confidence: {int(dr_data['confidence']*100)}%, DME: {dme_data['risk']}, Status: {output['reliability']['overall_ai_status']}"
    )

    # Format paths to media URLs for response
    return {
        "screening_id": screening.screening_id,
        "quality": q_data,
        "dr_classification": dr_data,
        "dme_risk": dme_data,
        "lesions": {
            **les_data,
            "lesion_map_url": f"/media/explanations/{os.path.basename(les_data['lesion_map_path'])}"
        },
        "vessels": {
            "vessel_visibility": ves_data["vessel_visibility"],
            "mask_url": f"/media/explanations/{os.path.basename(ves_data['mask_path'])}",
            "overlay_url": f"/media/explanations/{os.path.basename(ves_data['overlay_path'])}",
            "model_version": ves_data["model_version"]
        },
        "explainability": {
            "gradcam_url": f"/media/explanations/{os.path.basename(xai_data['gradcam_path'])}",
            "overlay_url": f"/media/explanations/{os.path.basename(xai_data['overlay_path'])}",
            "lesion_map_url": f"/media/explanations/{os.path.basename(les_data['lesion_map_path'])}",
            "vessel_map_url": f"/media/explanations/{os.path.basename(ves_data['overlay_path'])}",
            "combined_url": f"/media/explanations/{os.path.basename(xai_data['combined_path'])}",
            "reasoning_summary": xai_data["reasoning_summary"],
            "model_version": xai_data["model_version"]
        },
        "reliability": output["reliability"],
        "status": screening.status
    }

@router.get("/evaluation", response_model=ModelEvaluationResponse)
def get_model_evaluation():
    return ModelEvaluator.get_messidor2_evaluation()

@router.get("/model-diagnostics")
def get_model_diagnostics():
    """
    Returns live AI model diagnostic telemetry for developer/admin panel:
      - Model loaded state
      - Architecture & checkpoint path
      - Class mapping (0 -> DR 0, 1 -> DR 1, ...)
      - Last inference statistics (raw logits, softmax probabilities, image stats)
    """
    from app.ai.orchestrator import orchestrator
    clf = orchestrator.dr_model
    last_inf = getattr(clf, "last_inference", None)
    return {
        "model_loaded": getattr(clf, "is_loaded", True),
        "model_architecture": getattr(clf, "model_version", "ResNet-18 DR Classifier"),
        "checkpoint_path": getattr(clf, "checkpoint_path", ""),
        "device": str(getattr(clf, "device", "cpu")),
        "class_mapping": {str(k): f"DR {k}: {v}" for k, v in getattr(clf, "CLASS_LABELS", {}).items()},
        "last_inference": last_inf
    }
