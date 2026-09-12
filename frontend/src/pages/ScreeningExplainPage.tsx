import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Stethoscope, ArrowLeft } from 'lucide-react';
import { api } from '../services/api';
import { ScreeningStepper } from '../components/ScreeningStepper';
import { ExplainabilityViewer } from '../components/ExplainabilityViewer';
import { ScreeningDetail } from '../types';

export const ScreeningExplainPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [screening, setScreening] = useState<ScreeningDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await api.getScreeningDetail(id!);
      setScreening(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const originalImgUrl = screening?.retinal_image?.url
    ? api.getMediaUrl(screening.retinal_image.url)
    : api.getMediaUrl('/media/uploads/demo_fundus.jpg');

  return (
    <div>
      <ScreeningStepper currentStep={5} screeningId={id} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 space-y-6">
        <ExplainabilityViewer
          originalUrl={originalImgUrl}
          explanation={screening?.explanation}
          lesions={screening?.lesion_result}
          vessels={screening?.vessel_result}
          drGrade={screening?.ai_result?.dr_grade ?? 2}
          drLabel={screening?.ai_result?.label ?? 'Moderate DR'}
        />

        {/* Action Bar */}
        <div className="flex items-center justify-between pt-4">
          <button
            onClick={() => navigate(`/screening/${id}/results`)}
            className="btn-secondary text-xs inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Result Overview</span>
          </button>

          <button
            onClick={() => navigate(`/screening/${id}/review`)}
            className="btn-primary py-2.5 px-6 font-bold text-xs shadow-md inline-flex items-center gap-2"
          >
            <Stethoscope className="w-4 h-4" />
            <span>PROCEED TO DOCTOR REVIEW</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
