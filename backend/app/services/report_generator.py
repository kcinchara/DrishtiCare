import os
import datetime
from pathlib import Path
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from app.config import settings

class ReportGenerator:
    @staticmethod
    def generate_screening_report(screening_data: dict, output_filename: str = None) -> str:
        if not output_filename:
            screening_id = screening_data.get("screening_id", "SCR-UNKNOWN")
            output_filename = f"report_{screening_id}_{int(datetime.datetime.utcnow().timestamp())}.pdf"
            
        output_path = settings.REPORT_DIR / output_filename
        
        doc = SimpleDocTemplate(
            str(output_path),
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )
        
        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            'ReportTitle',
            parent=styles['Heading1'],
            fontSize=18,
            leading=22,
            textColor=colors.HexColor('#0F172A'),
            fontName='Helvetica-Bold'
        )
        subtitle_style = ParagraphStyle(
            'ReportSubtitle',
            parent=styles['Normal'],
            fontSize=9,
            leading=12,
            textColor=colors.HexColor('#475569')
        )
        section_heading = ParagraphStyle(
            'SectionHeading',
            parent=styles['Heading2'],
            fontSize=12,
            leading=16,
            textColor=colors.HexColor('#1E293B'),
            fontName='Helvetica-Bold',
            spaceBefore=8,
            spaceAfter=4
        )
        body_style = ParagraphStyle(
            'ReportBody',
            parent=styles['Normal'],
            fontSize=9,
            leading=13,
            textColor=colors.HexColor('#334155')
        )
        disclaimer_style = ParagraphStyle(
            'Disclaimer',
            parent=styles['Italic'],
            fontSize=8,
            leading=11,
            textColor=colors.HexColor('#B91C1C'),
            fontName='Helvetica-Oblique'
        )
        
        elements = []
        
        # Header with branding
        elements.append(Paragraph("PATIENT SCREENING REPORT", title_style))
        elements.append(Paragraph("Retinal Edge Triage — Explainable AI-Assisted Diabetic Retinopathy Screening for Rural Healthcare", subtitle_style))
        gen_time = datetime.datetime.utcnow().strftime('%d-%b-%Y %H:%M UTC')
        elements.append(Paragraph(f"Screening Date & Time: <b>{gen_time}</b> | Reference ID: <b>{screening_data.get('screening_id', 'N/A')}</b>", subtitle_style))
        elements.append(Spacer(1, 8))
        elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#0284C7'), spaceBefore=2, spaceAfter=8))
        
        # Patient Information Table
        p = screening_data.get("patient", {})
        patient_table_data = [
            [
                Paragraph("<b>Patient ID:</b> " + str(p.get("patient_id", "N/A")), body_style),
                Paragraph("<b>Full Name:</b> " + str(p.get("full_name", "N/A")), body_style),
                Paragraph("<b>Age / Gender:</b> " + f"{p.get('age', 'N/A')} / {p.get('gender', 'N/A')}", body_style)
            ],
            [
                Paragraph("<b>Screening ID:</b> " + str(screening_data.get("screening_id", "N/A")), body_style),
                Paragraph("<b>Location:</b> " + str(p.get("screening_location", "Rural PHC")), body_style),
                Paragraph("<b>Diabetes Type / Duration:</b> " + f"{p.get('diabetes_type', 'Type 2')} ({p.get('diabetes_duration', 'N/A')})", body_style)
            ]
        ]
        t_patient = Table(patient_table_data, colWidths=[2.3*inch, 2.7*inch, 2.5*inch])
        t_patient.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ]))
        elements.append(t_patient)
        elements.append(Spacer(1, 8))
        
        # Image Information & Quality Check
        elements.append(Paragraph("1. Retinal Image Acquisition & Quality Gate", section_heading))
        q = screening_data.get("quality_assessment", {})
        img_table_data = [
            [
                Paragraph("<b>Eye Evaluated:</b> " + str(screening_data.get("eye", "Right Eye")), body_style),
                Paragraph("<b>Image Source:</b> " + str(screening_data.get("image_source", "Fundus Camera")), body_style),
                Paragraph("<b>Quality Score:</b> " + f"{q.get('overall_score', 91.0):.1f}%", body_style),
                Paragraph("<b>Quality Status:</b> " + f"<font color='{'#15803D' if q.get('status')=='GOOD' else '#B45309'}'><b>{q.get('status', 'GOOD')}</b></font>", body_style)
            ],
            [
                Paragraph("<b>Focus / Blur:</b> " + f"{q.get('blur_score', 88.0):.1f}%", body_style),
                Paragraph("<b>Illumination:</b> " + f"{q.get('illumination_score', 92.0):.1f}%", body_style),
                Paragraph("<b>Vessel Visibility:</b> " + f"{q.get('vessel_visibility', 91.0):.1f}%", body_style),
                Paragraph("<b>Field of View:</b> " + f"{q.get('field_of_view_score', 94.0):.1f}%", body_style)
            ]
        ]
        t_img = Table(img_table_data, colWidths=[1.85*inch, 1.95*inch, 1.8*inch, 1.9*inch])
        t_img.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#FFFFFF')),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#F1F5F9')),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        elements.append(t_img)
        elements.append(Spacer(1, 8))
        
        # AI Assessment & Clinical Findings
        elements.append(Paragraph("2. Diabetic Retinopathy Screening & Detection Result", section_heading))
        ai = screening_data.get("ai_result", {})
        lesions = screening_data.get("lesion_result", {})
        both_eyes = screening_data.get("both_eyes_data", {})
        eye_scope = screening_data.get("eye", "Right Eye")
        grade = ai.get("dr_grade", 2)
        label = ai.get("label", "Moderate NPDR")
        confidence_val = round(ai.get("confidence", 0.94) * 100, 1)
        dr_detected = grade >= 1
        dr_status_text = "DETECTED" if dr_detected else "NOT DETECTED"
        dr_status_color = "#DC2626" if dr_detected else "#15803D"

        # Check for both-eyes analysis
        both_results = both_eyes.get("analysis", {}).get("results", {}) if both_eyes else {}
        left_eye_res = both_results.get("left_eye")
        right_eye_res = both_results.get("right_eye")

        # Construct concise clinical explanation
        if grade == 0:
            brief_explanation = "Normal retinal fundus morphology. No microaneurysms, hemorrhages, or exudates detected."
            recommended_action = "Non-referable findings. Routine annual re-screening recommended in 12 months."
        elif grade == 1:
            brief_explanation = f"Mild non-proliferative retinopathy with isolated microaneurysms ({lesions.get('microaneurysms', 2)} detected). No macular edema."
            recommended_action = "Non-referable early findings. Re-screening recommended in 6-12 months."
        elif grade == 2:
            brief_explanation = f"Moderate non-proliferative changes with microaneurysms ({lesions.get('microaneurysms', 8)}) and exudates ({lesions.get('hard_exudates', 5)}). Secondary review indicated."
            recommended_action = "Ophthalmology evaluation recommended within 3 months for stereoscopic examination."
        elif grade == 3:
            brief_explanation = f"Severe non-proliferative diabetic retinopathy with multi-quadrant hemorrhages ({lesions.get('hemorrhages', 10)}) and vascular beading."
            recommended_action = "Severe diabetic retinopathy requires urgent ophthalmic evaluation within 1 month."
        else:
            brief_explanation = f"Proliferative diabetic retinopathy with high risk of vision-threatening neovascularization and vitreous complications."
            recommended_action = "Urgent tertiary retinal consultation required for immediate laser photocoagulation assessment."

        # Format probability distribution
        probs_dict = ai.get("probabilities", {})
        if probs_dict:
            prob_items = []
            for k in ["0", "1", "2", "3", "4"]:
                if k in probs_dict:
                    val = round(float(probs_dict[k]) * 100, 1)
                    prob_items.append(f"DR {k}: <b>{val}%</b>")
            probs_str = " &nbsp;|&nbsp; ".join(prob_items)
        else:
            probs_str = f"Primary Class Probability: <b>{confidence_val}%</b>"

        if left_eye_res and right_eye_res:
            # Dual-Eye Report Layout
            l_grade = left_eye_res.get("grade", 0)
            l_lbl = left_eye_res.get("label", "No DR")
            l_conf = round(left_eye_res.get("confidence", 0.95) * 100, 1)

            r_grade = right_eye_res.get("grade", 0)
            r_lbl = right_eye_res.get("label", "No DR")
            r_conf = round(right_eye_res.get("confidence", 0.95) * 100, 1)

            ai_table_data = [
                [
                    Paragraph("<b>Screening Scope:</b>", body_style),
                    Paragraph("<b>Both Eyes (OS & OD)</b>", body_style),
                    Paragraph("<b>Overall Triage Severity:</b>", body_style),
                    Paragraph(f"<b>Grade: {grade}</b> — <b>{label}</b>", body_style)
                ],
                [
                    Paragraph("<b>Left Eye (OS):</b>", body_style),
                    Paragraph(f"<b>DR {l_grade} ({l_lbl})</b> — Conf: <b>{l_conf}%</b>", body_style),
                    Paragraph("<b>Right Eye (OD):</b>", body_style),
                    Paragraph(f"<b>DR {r_grade} ({r_lbl})</b> — Conf: <b>{r_conf}%</b>", body_style)
                ],
                [
                    Paragraph("<b>Probability Breakdown:</b>", body_style),
                    Paragraph(probs_str, body_style),
                    Paragraph("<b>DME Risk Status:</b>", body_style),
                    Paragraph(f"<b>{ai.get('dme_risk', 'Low')}</b>", body_style)
                ],
                [
                    Paragraph("<b>Result Explanation:</b>", body_style),
                    Paragraph(brief_explanation, body_style),
                    Paragraph("<b>Recommended Action:</b>", body_style),
                    Paragraph(f"<font color='{'#DC2626' if ai.get('is_referable', True) else '#15803D'}'><b>{recommended_action}</b></font>", body_style)
                ]
            ]
        else:
            # Single-Eye Report Layout
            ai_table_data = [
                [
                    Paragraph("<b>Screened Eye:</b>", body_style),
                    Paragraph(f"<b>{eye_scope}</b>", body_style),
                    Paragraph("<b>DR Grade & Severity:</b>", body_style),
                    Paragraph(f"<b>Grade: {grade}</b> — <b>{label}</b>", body_style)
                ],
                [
                    Paragraph("<b>Model Confidence:</b>", body_style),
                    Paragraph(f"<b>{confidence_val}%</b>", body_style),
                    Paragraph("<b>DME Risk Status:</b>", body_style),
                    Paragraph(f"<b>{ai.get('dme_risk', 'Low')}</b>", body_style)
                ],
                [
                    Paragraph("<b>Class Probabilities:</b>", body_style),
                    Paragraph(probs_str, body_style),
                    Paragraph("<b>DR Status:</b>", body_style),
                    Paragraph(f"<font color='{dr_status_color}'><b>Diabetic Retinopathy: {dr_status_text}</b></font>", body_style)
                ],
                [
                    Paragraph("<b>Result Explanation:</b>", body_style),
                    Paragraph(brief_explanation, body_style),
                    Paragraph("<b>Recommended Action:</b>", body_style),
                    Paragraph(f"<font color='{'#DC2626' if ai.get('is_referable', True) else '#15803D'}'><b>{recommended_action}</b></font>", body_style)
                ]
            ]

        t_ai = Table(ai_table_data, colWidths=[1.8*inch, 2.6*inch, 1.4*inch, 1.7*inch])
        t_ai.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        elements.append(t_ai)
        elements.append(Spacer(1, 8))
        
        # Longitudinal Comparison (Previous vs Current)
        elements.append(Paragraph("3. Previous vs Current Screening Comparison", section_heading))
        comp = screening_data.get("comparison", {})
        if comp.get("has_previous"):
            chg_status = comp.get("change_status", "STABLE")
            chg_color = "#DC2626" if chg_status == "WORSENED" else ("#16A34A" if chg_status == "IMPROVED" else "#0284C7")
            comp_table_data = [
                [
                    Paragraph("<b>Previous Screening:</b>", body_style),
                    Paragraph(f"Date: <b>{comp.get('previous_date', 'N/A')}</b> | Grade: <b>DR {comp.get('previous_grade', 'N/A')}</b>", body_style),
                    Paragraph("<b>Current Screening:</b>", body_style),
                    Paragraph(f"Date: <b>{gen_time}</b> | Grade: <b>DR {comp.get('current_grade', grade)}</b>", body_style)
                ],
                [
                    Paragraph("<b>Overall Trend:</b>", body_style),
                    Paragraph(f"<font color='{chg_color}'><b>{chg_status}</b></font>", body_style),
                    Paragraph("<b>Recommendation:</b>", body_style),
                    Paragraph(str(comp.get("recommendation", "Continue regular follow-up")), body_style)
                ]
            ]
            t_comp = Table(comp_table_data, colWidths=[1.8*inch, 2.6*inch, 1.4*inch, 1.7*inch])
            t_comp.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
                ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
                ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
                ('TOPPADDING', (0,0), (-1,-1), 4),
                ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ]))
            elements.append(t_comp)
        else:
            elements.append(Paragraph("<i>This is the patient's first recorded screening. No previous result is available for comparison.</i>", body_style))
        elements.append(Spacer(1, 8))
        
        # Human-in-the-Loop Doctor Review
        elements.append(Paragraph("4. Human-in-the-Loop Ophthalmologist Adjudication", section_heading))
        review = screening_data.get("doctor_review", {})
        doc_decision = review.get("decision", "PENDING_REVIEW")
        
        review_data = [
            [
                Paragraph("<b>Doctor Decision:</b>", body_style),
                Paragraph(f"<b>{doc_decision}</b>", body_style),
                Paragraph("<b>Reviewing Doctor:</b>", body_style),
                Paragraph(str(review.get("doctor_name", "Dr. Rajesh Varma, MS")), body_style)
            ],
            [
                Paragraph("<b>Final Grade Assigned:</b>", body_style),
                Paragraph(f"Grade {review.get('final_grade', grade)}", body_style),
                Paragraph("<b>Override Justification:</b>", body_style),
                Paragraph(str(review.get("override_reason", "None / Matched AI assessment")), body_style)
            ],
            [
                Paragraph("<b>Clinical Notes:</b>", body_style),
                Paragraph(str(review.get("doctor_comments", "Clinical findings consistent with diabetic retinopathy changes.")), body_style),
                Paragraph("<b>HCW Instructions:</b>", body_style),
                Paragraph(str(review.get("instructions_for_hcw", "Proceed to patient referral counselling.")), body_style)
            ]
        ]
        t_rev = Table(review_data, colWidths=[1.8*inch, 2.6*inch, 1.4*inch, 1.7*inch])
        t_rev.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#EFF6FF')),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#93C5FD')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#BFDBFE')),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        elements.append(t_rev)
        elements.append(Spacer(1, 8))
        
        # Triage and Referral Recommendation
        elements.append(Paragraph("5. Risk Triage & Clinical Disposition", section_heading))
        triage = screening_data.get("triage_result", {})
        referral = screening_data.get("referral", {})
        
        triage_data = [
            [
                Paragraph("<b>Risk Category:</b>", body_style),
                Paragraph(f"<b>{triage.get('risk_category', 'HIGH')} RISK</b>", body_style),
                Paragraph("<b>Referral Priority:</b>", body_style),
                Paragraph(f"<b>{referral.get('priority', 'URGENT')}</b>", body_style)
            ],
            [
                Paragraph("<b>Referral Reference ID:</b>", body_style),
                Paragraph(f"<b>{referral.get('referral_id', 'REF-2026-PENDING')}</b>", body_style),
                Paragraph("<b>Follow-up Schedule:</b>", body_style),
                Paragraph(f"<b>{triage.get('follow_up_months', 3)} Months</b>", body_style)
            ],
            [
                Paragraph("<b>Clinical Justification:</b>", body_style),
                Paragraph(str(triage.get("referral_reason", referral.get("reason", "Diabetic retinopathy evaluation required."))), body_style),
                Paragraph("<b>Referral Status:</b>", body_style),
                Paragraph(f"<b>{referral.get('status', 'PENDING')}</b>", body_style)
            ]
        ]
        t_tri = Table(triage_data, colWidths=[1.8*inch, 2.6*inch, 1.4*inch, 1.7*inch])
        t_tri.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#FEF2F2')),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#FCA5A5')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#FECACA')),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        elements.append(t_tri)
        elements.append(Spacer(1, 8))

        # Section 6: Recommended Eye-Care Facility (Hospital Details in Final Report)
        elements.append(Paragraph("6. Recommended Eye-Care Facility (Referral Destination)", section_heading))
        h_name = referral.get("hospital_name") or referral.get("recommended_destination") or "ABC Eye Hospital"
        h_dist = referral.get("hospital_distance") or "2.4 km away"
        h_addr = referral.get("hospital_address") or "Sayyaji Rao Road, Medar Block, Yadavagiri, Mysuru, Karnataka 570020"
        h_contact = referral.get("hospital_contact") or "+91 821 241 9300"
        h_reason = referral.get("reason") or f"{label} requires ophthalmic evaluation based on AI screening result."
        h_directions = referral.get("directions_url") or f"https://www.google.com/maps/search/?api=1&query={h_name.replace(' ', '+')}+Mysuru"

        hospital_table_data = [
            [
                Paragraph("<b>Hospital / Clinic Name:</b>", body_style),
                Paragraph(f"<b>{h_name}</b>", body_style),
                Paragraph("<b>Distance:</b>", body_style),
                Paragraph(f"<b>{h_dist}</b>", body_style)
            ],
            [
                Paragraph("<b>Hospital Address:</b>", body_style),
                Paragraph(h_addr, body_style),
                Paragraph("<b>Contact Number:</b>", body_style),
                Paragraph(f"<b>{h_contact}</b>", body_style)
            ],
            [
                Paragraph("<b>Reason for Referral:</b>", body_style),
                Paragraph(h_reason, body_style),
                Paragraph("<b>Navigation / Directions:</b>", body_style),
                Paragraph(f"<a href='{h_directions}'><u>View Map & Directions</u></a>", body_style)
            ]
        ]
        t_hosp = Table(hospital_table_data, colWidths=[1.8*inch, 2.6*inch, 1.4*inch, 1.7*inch])
        t_hosp.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F0FDF4')),
            ('BOX', (0,0), (-1,-1), 0.75, colors.HexColor('#16A34A')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#BBF7D0')),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ]))
        elements.append(t_hosp)
        elements.append(Spacer(1, 8))

        # Section 7: Patient Care & Lifestyle Guidance
        elements.append(Paragraph("7. Patient Care & Lifestyle Guidance", section_heading))
        home_care = screening_data.get("home_care", {})
        hc_msg = home_care.get("message", "Continue diabetes management and regular eye screening as advised.")
        elements.append(Paragraph(f"<b>Guidance:</b> {hc_msg}", body_style))
        elements.append(Spacer(1, 4))
        
        habits = home_care.get("habits", [
            "Diet & Glycemic Control: Balanced diet rich in green leafy vegetables and whole grains; avoid refined sugars.",
            "Medication Adherence: Take prescribed diabetes medicines and insulin consistently on schedule.",
            "Daily Physical Activity: 30 minutes of moderate activity like walking or doctor-approved exercise.",
            "Zero Tobacco: Avoid smoking and tobacco products to protect fragile retinal micro-capillaries.",
            "Routine Retinal Exams: Attend scheduled dilated retinal examinations even if vision seems clear.",
            "Emergency Red Flags: Seek emergency care if experiencing sudden flashes of light, dark floaters, or vision loss."
        ])
        habits_formatted = "<br/>".join([f"• {h}" for h in habits])
        elements.append(Paragraph(habits_formatted, body_style))
        elements.append(Spacer(1, 4))
        elements.append(Paragraph(
            "<b>NOTICE:</b> Patient care and lifestyle guidance support general wellness and glycemic control, but do not cure or reverse diabetic retinopathy (DR 1–4) and cannot replace examination by an eye specialist.",
            disclaimer_style
        ))
        elements.append(Spacer(1, 10))
        
        # Statutory Medical Disclaimer
        elements.append(HRFlowable(width="100%", thickness=0.8, color=colors.HexColor('#E2E8F0'), spaceBefore=2, spaceAfter=4))
        elements.append(Paragraph(
            "<b>STATUTORY CLINICAL NOTICE:</b> This referral recommendation is based on the screening assessment. "
            "Final clinical management should be determined by a qualified healthcare professional. "
            "AI predictions DO NOT constitute a definitive medical diagnosis. "
            "Final clinical interpretation and management must always be performed by a qualified ophthalmologist.",
            disclaimer_style
        ))
        
        # Build PDF
        doc.build(elements)
        return str(output_path)
