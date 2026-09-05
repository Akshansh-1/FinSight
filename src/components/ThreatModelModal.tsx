import React from "react";
import { X, ShieldCheck, CheckCircle2 } from "lucide-react";

interface ThreatModelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ThreatModelModal: React.FC<ThreatModelModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#13241A]/60 flex items-center justify-center p-4">
      <div className="max-w-3xl w-full max-h-[90vh] flex flex-col border border-[#8FA899] bg-white text-[#13241A]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#EDF3EF] border-b border-[#8FA899] text-[#13241A]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-white text-[#13241A] flex items-center justify-center border border-[#8FA899]">
              <ShieldCheck className="w-4 h-4 text-[#2D6A4F]" />
            </div>
            <div>
              <h3 className="font-tech text-xs uppercase tracking-wider font-bold text-[#13241A]">
                [SYS-AUDIT] AGENTIC THREAT MODEL & ARCHITECTURE
              </h3>
              <p className="font-mono text-[10px] text-[#526E5D]">
                OWASP Web & LLM Top 10 Mitigation Matrix across the 5 Threat Zones
              </p>
            </div>
          </div>
          <button
            id="close-threat-modal-btn"
            onClick={onClose}
            className="p-1 text-[#526E5D] hover:text-[#13241A] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs bg-[#F8F9F5]">
          <div className="p-3.5 flex items-start gap-2.5 border border-[#8FA899] bg-[#EDF3EF] text-[#13241A]">
            <CheckCircle2 className="w-4 h-4 text-[#2D6A4F] shrink-0 mt-0.5" />
            <div className="leading-relaxed font-sans text-xs">
              <span className="font-tech font-bold uppercase tracking-wider text-[#13241A]">[SECURITY COMPLIANCE] </span>
              All credentials are kept server-side (Secret Manager & env vars). Authentication is delegated to Google Identity via Firebase Auth. Firestore security rules strictly isolate user documents to authenticated <code className="bg-white px-1 py-0.5 border border-[#8FA899] font-mono text-[10px]">request.auth.uid</code>.
            </div>
          </div>

          <div className="overflow-x-auto border border-[#8FA899] bg-white">
            <table className="w-full border-collapse text-left font-mono text-xs">
              <thead>
                <tr className="border-b bg-[#EDF3EF] text-[#13241A] border-[#8FA899] font-tech uppercase tracking-wider text-[10px] font-bold">
                  <th className="p-2.5 border-r border-[#8FA899]">Threat Zone</th>
                  <th className="p-2.5 border-r border-[#8FA899]">Potential Risk Scenario</th>
                  <th className="p-2.5 border-r border-[#8FA899]">OWASP</th>
                  <th className="p-2.5">Implemented Countermeasure</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#8FA899]/30">
                <tr>
                  <td className="p-2.5 font-tech font-bold border-r border-[#8FA899]/30 bg-[#F8F9F5] text-[#13241A]">
                    1. Input Surfaces
                  </td>
                  <td className="p-2.5 border-r border-[#8FA899]/30 font-sans">
                    Malicious user input in free-text journal aiming to trigger prompt injection or SQL/NoSQL payload.
                  </td>
                  <td className="p-2.5 border-r border-[#8FA899]/30 text-[10px] text-[#526E5D] font-mono">
                    LLM01 / A03
                  </td>
                  <td className="p-2.5 font-sans text-xs">
                    Defensive null-safe deserialization, strict character limits, and delimiter-wrapping (<code className="font-mono bg-[#F8F9F5] border border-[#8FA899] px-1">&quot;&quot;&quot;</code>) treating entries strictly as passive data.
                  </td>
                </tr>

                <tr>
                  <td className="p-2.5 font-tech font-bold border-r border-[#8FA899]/30 bg-[#F8F9F5] text-[#13241A]">
                    2. Planning & Reasoning
                  </td>
                  <td className="p-2.5 border-r border-[#8FA899]/30 font-sans">
                    Prompt injection attempting to alter financial advice or trick JSON schema into returning malicious content.
                  </td>
                  <td className="p-2.5 border-r border-[#8FA899]/30 text-[10px] text-[#526E5D] font-mono">
                    LLM02 / LLM07
                  </td>
                  <td className="p-2.5 font-sans text-xs">
                    Rigid structured JSON output schema enforced by Gemini Flash engine with server-side validation and sanitization.
                  </td>
                </tr>

                <tr>
                  <td className="p-2.5 font-tech font-bold border-r border-[#8FA899]/30 bg-[#F8F9F5] text-[#13241A]">
                    3. Tool Execution
                  </td>
                  <td className="p-2.5 border-r border-[#8FA899]/30 font-sans">
                    SSRF or dynamic execution risks via FX conversion API.
                  </td>
                  <td className="p-2.5 border-r border-[#8FA899]/30 text-[10px] text-[#526E5D] font-mono">
                    A10 (SSRF)
                  </td>
                  <td className="p-2.5 font-sans text-xs">
                    Strict currency code whitelist; requests are bounded to vetted external public FX service with timeout controller and static local rate fallback.
                  </td>
                </tr>

                <tr>
                  <td className="p-2.5 font-tech font-bold border-r border-[#8FA899]/30 bg-[#F8F9F5] text-[#13241A]">
                    4. Memory & State
                  </td>
                  <td className="p-2.5 border-r border-[#8FA899]/30 font-sans">
                    Cross-user data leakage, session hijacking, or unauthenticated reading of private financial logs.
                  </td>
                  <td className="p-2.5 border-r border-[#8FA899]/30 text-[10px] text-[#526E5D] font-mono">
                    A01 (Broken Access Control)
                  </td>
                  <td className="p-2.5 font-sans text-xs">
                    Owner-bound Cloud Firestore security rules (<code className="font-mono bg-[#F8F9F5] border border-[#8FA899] px-1">request.auth.uid == userId</code>) prohibiting cross-user queries. Zero plain passwords handled in code.
                  </td>
                </tr>

                <tr>
                  <td className="p-2.5 font-tech font-bold border-r border-[#8FA899]/30 bg-[#F8F9F5] text-[#13241A]">
                    5. Inter-System Communication
                  </td>
                  <td className="p-2.5 border-r border-[#8FA899]/30 font-sans">
                    API key leakage (e.g. Gemini credentials) to client browser or network inspector.
                  </td>
                  <td className="p-2.5 border-r border-[#8FA899]/30 text-[10px] text-[#526E5D] font-mono">
                    A02 (Cryptographic Failures)
                  </td>
                  <td className="p-2.5 font-sans text-xs">
                    All Gemini API interactions are encapsulated inside server-side Express <code className="font-mono bg-[#F8F9F5] border border-[#8FA899] px-1">/api/*</code> routes. <code className="font-mono bg-[#F8F9F5] border border-[#8FA899] px-1">GEMINI_API_KEY</code> is never exposed with <code className="font-mono bg-[#F8F9F5] border border-[#8FA899] px-1">VITE_</code> prefix.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="space-y-1.5 p-3.5 border border-[#8FA899] bg-white">
            <h4 className="font-tech text-xs uppercase tracking-wider font-bold text-[#13241A]">[SYS] FIRESTORE SECURITY RULES</h4>
            <pre className="text-[11px] font-mono bg-[#13241A] text-[#EDF3EF] p-3 overflow-x-auto border border-[#8FA899]">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      match /{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}`}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#8FA899] bg-white flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 font-tech text-xs uppercase tracking-wider font-bold cursor-pointer bg-[#13241A] hover:bg-[#2D6A4F] text-white transition-colors"
          >
            DISMISS AUDIT
          </button>
        </div>
      </div>
    </div>
  );
};
