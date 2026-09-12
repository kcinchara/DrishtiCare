import React, { useState, useEffect } from 'react';
import {
  Paperclip, Plus, FileText, Trash2, Eye, ExternalLink,
  CheckCircle2, AlertCircle, FileSpreadsheet, Activity, Image as ImageIcon
} from 'lucide-react';
import { api } from '../services/api';
import { useLanguage } from '../utils/i18n';

interface Attachment {
  id: string;
  name: string;
  category: 'HbA1c / Lab' | 'Prescription' | 'Prior Fundus' | 'Clinical Note';
  fileType: string;
  sizeKb: number;
  uploadedAt: string;
  previewUrl?: string;
  notes?: string;
}

interface Props {
  screeningId: string | number;
  readOnly?: boolean;
}

export const ClinicalAttachments: React.FC<Props> = ({ screeningId, readOnly = false }) => {
  const { t } = useLanguage();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activePreview, setActivePreview] = useState<Attachment | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Attachment['category']>('HbA1c / Lab');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadAttachments();
  }, [screeningId]);

  const loadAttachments = () => {
    const list = api.getAttachments(screeningId);
    if (list.length === 0) {
      // Default initial mock attachment for realistic medical records demonstration
      const initial: Attachment = {
        id: `att_init_${screeningId}`,
        name: 'PHC_Lab_HbA1c_Report_Aug2026.pdf',
        category: 'HbA1c / Lab',
        fileType: 'PDF Document',
        sizeKb: 142,
        uploadedAt: new Date().toLocaleDateString(),
        notes: 'HbA1c measured at 8.2%. Fasting Blood Sugar: 168 mg/dL.',
      };
      api.saveAttachment(screeningId, initial);
      setAttachments([initial]);
    } else {
      setAttachments(list);
    }
  };

  const handleAddAttachment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newAtt: Attachment = {
      id: `att_${Date.now()}`,
      name: name.trim(),
      category,
      fileType: category === 'Prior Fundus' ? 'JPEG Image' : 'Clinical Document',
      sizeKb: Math.floor(80 + Math.random() * 250),
      uploadedAt: new Date().toLocaleDateString(),
      notes: notes.trim() || 'Attached during frontline screening triage.',
    };

    const updated = api.saveAttachment(screeningId, newAtt);
    setAttachments(updated);
    setName('');
    setNotes('');
    setIsOpen(false);
  };

  const addPreset = (presetName: string, presetCat: Attachment['category'], presetNotes: string) => {
    const newAtt: Attachment = {
      id: `att_${Date.now()}`,
      name: presetName,
      category: presetCat,
      fileType: presetCat === 'Prior Fundus' ? 'JPEG Image' : 'PDF Document',
      sizeKb: Math.floor(110 + Math.random() * 180),
      uploadedAt: new Date().toLocaleDateString(),
      notes: presetNotes,
    };
    const updated = api.saveAttachment(screeningId, newAtt);
    setAttachments(updated);
  };

  const handleDelete = (id: string) => {
    const updated = api.removeAttachment(screeningId, id);
    setAttachments(updated);
  };

  const getCategoryBadge = (cat: Attachment['category']) => {
    switch (cat) {
      case 'HbA1c / Lab':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Prior Fundus':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'Prescription':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-amber-100 text-amber-800 border-amber-200';
    }
  };

  return (
    <div className="card space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Paperclip className="w-5 h-5 text-teal-600" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {t('attach.title', 'Clinical Records & Attachments')}
            </h3>
            <p className="text-[11px] text-slate-500">
              {t('attach.subtitle', 'HbA1c slips, blood glucose notes, prescriptions, and prior fundus photos')}
            </p>
          </div>
        </div>

        {!readOnly && (
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="btn-primary text-xs py-1.5 px-3"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('attach.uploadBtn', 'Add Attachment')}</span>
          </button>
        )}
      </div>

      {/* Quick demo presets row */}
      {!readOnly && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 self-center mr-1">
            Quick Attach:
          </span>
          <button
            type="button"
            onClick={() => addPreset('Recent_HbA1c_Lab_Slip_8.9%.pdf', 'HbA1c / Lab', 'Severe uncontrolled HbA1c: 8.9% with microalbuminuria.')}
            className="text-[11px] px-2.5 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-md border border-purple-200 font-medium transition-colors"
          >
            + HbA1c Lab Slip (8.9%)
          </button>
          <button
            type="button"
            onClick={() => addPreset('Ophthalmologist_Rx_Metformin_2025.pdf', 'Prescription', 'Oral hypoglycemic agents: Metformin 1000mg + Glimepiride.')}
            className="text-[11px] px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-md border border-emerald-200 font-medium transition-colors"
          >
            + Prior Prescription Note
          </button>
          <button
            type="button"
            onClick={() => addPreset('Prior_RightEye_Fundus_2024.jpg', 'Prior Fundus', 'Baseline fundus photo from rural eye camp 14 months ago.')}
            className="text-[11px] px-2.5 py-1 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 rounded-md border border-cyan-200 font-medium transition-colors"
          >
            + 2024 Baseline Fundus Photo
          </button>
        </div>
      )}

      {/* Attachments List */}
      {attachments.length === 0 ? (
        <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          {t('attach.noDocs', 'No documents attached yet.')}
        </div>
      ) : (
        <div className="space-y-2">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-white border border-slate-200 text-teal-600 shadow-2xs mt-0.5">
                  {att.category === 'Prior Fundus' ? (
                    <ImageIcon className="w-4 h-4" />
                  ) : att.category === 'HbA1c / Lab' ? (
                    <Activity className="w-4 h-4" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">{att.name}</span>
                    <span className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded border ${getCategoryBadge(att.category)}`}>
                      {att.category}
                    </span>
                  </div>
                  {att.notes && (
                    <p className="text-[11px] text-slate-600 mt-0.5">{att.notes}</p>
                  )}
                  <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                    <span>{att.fileType}</span>
                    <span>•</span>
                    <span>{att.sizeKb} KB</span>
                    <span>•</span>
                    <span>Uploaded {att.uploadedAt}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActivePreview(att)}
                  className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                  title="View Attachment"
                >
                  <Eye className="w-4 h-4" />
                </button>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleDelete(att.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Remove Attachment"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Attachment Form Modal */}
      {isOpen && (
        <form onSubmit={handleAddAttachment} className="p-4 bg-teal-50/40 rounded-xl border border-teal-200 space-y-3">
          <div className="font-bold text-xs text-teal-900 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            <span>Attach New Clinical Record</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Document / File Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. HbA1c_Slip_Sep2026.pdf"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Clinical Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
              >
                <option value="HbA1c / Lab">HbA1c / Blood Glucose Report</option>
                <option value="Prescription">Doctor Prescription & Medications</option>
                <option value="Prior Fundus">Previous Retinal Fundus Photo</option>
                <option value="Clinical Note">Clinical Case / Referral Note</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Clinical Notes / Findings
            </label>
            <input
              type="text"
              placeholder="e.g. Fasting 180 mg/dL, patient on Metformin for 8 years"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="btn-secondary text-xs py-1.5 px-3"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary text-xs py-1.5 px-3 font-semibold"
            >
              Save Attachment
            </button>
          </div>
        </form>
      )}

      {/* Attachment Preview Modal */}
      {activePreview && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="card max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-600" />
                <h4 className="font-bold text-sm text-slate-900">{activePreview.name}</h4>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getCategoryBadge(activePreview.category)}`}>
                {activePreview.category}
              </span>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="text-slate-700">
                <span className="font-bold">Clinical Notes: </span>
                {activePreview.notes}
              </div>
              <div className="text-[11px] text-slate-500">
                <span className="font-semibold">File Format: </span>
                {activePreview.fileType} • {activePreview.sizeKb} KB • Uploaded on {activePreview.uploadedAt}
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Verified and attached to patient's clinical screening record.</span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setActivePreview(null)}
                className="btn-primary text-xs py-1.5 px-4 font-semibold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
