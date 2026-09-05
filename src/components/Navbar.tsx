import React from "react";
import { User } from "firebase/auth";
import {
  Wallet,
  LogOut,
  ShieldCheck,
  Globe,
  Sparkles,
  ExternalLink,
  LogIn
} from "lucide-react";
import { SUPPORTED_CURRENCIES } from "../lib/currencies";

interface NavbarProps {
  user: User;
  homeCurrency: string;
  onCurrencyChange: (currency: string) => void;
  onSignOut: () => void;
  onOpenThreatModel: () => void;
  onOpenReportModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  homeCurrency,
  onCurrencyChange,
  onSignOut,
  onOpenThreatModel,
  onOpenReportModal,
}) => {
  const handleOpenNewWindow = () => {
    window.open(window.location.href, "_blank");
  };

  return (
    <header className="sticky top-0 z-30 bg-[#F8F9F5] border-b border-[#8FA899] text-[#13241A] px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
      {/* Title & System Badge */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-[#13241A] text-white flex items-center justify-center font-tech font-bold text-xs">
          FS
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-tech text-[10px] uppercase tracking-wider text-[#2D6A4F] font-bold">
              FinSight: Personal Ledger
            </span>
            <span className="inline-block w-1.5 h-1.5 bg-[#2D6A4F]"></span>
            <span className="font-mono text-[9px] uppercase tracking-widest text-[#526E5D]">
              SAGE & CLARITY
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-tech font-bold text-[#13241A] leading-tight tracking-tight">
            FinSight: Personal Ledger
          </h1>
        </div>
      </div>

      {/* Session Holder & Action Suite */}
      <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
        {/* Currency Switcher */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 border border-[#8FA899] bg-white text-[#13241A]">
          <Globe className="w-3.5 h-3.5 text-[#2D6A4F] shrink-0" />
          <span className="font-tech text-[10px] uppercase tracking-wider text-[#526E5D] font-bold">
            BASE:
          </span>
          <select
            id="home-currency-selector"
            value={homeCurrency}
            onChange={(e) => onCurrencyChange(e.target.value)}
            className="font-tech text-xs font-bold bg-transparent outline-none cursor-pointer pr-1 text-[#13241A]"
            aria-label="Select home currency"
          >
            {SUPPORTED_CURRENCIES.map((curr) => (
              <option
                key={curr.code}
                value={curr.code}
                className="bg-[#F8F9F5] text-[#13241A]"
              >
                {curr.code} ({curr.symbol})
              </option>
            ))}
          </select>
        </div>

        {/* AI Digest Button */}
        {onOpenReportModal && (
          <button
            id="report-modal-btn"
            onClick={onOpenReportModal}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2D6A4F] text-white hover:bg-[#23553F] transition-colors cursor-pointer font-tech text-[10px] uppercase tracking-widest font-bold"
            title="Generate AI Financial Health Digest & Export Data"
          >
            <Sparkles className="w-3 h-3 text-[#C4E2D2]" />
            <span>[SYS] Digest</span>
          </button>
        )}

        {/* Security Audit Button */}
        <button
          id="threat-model-btn"
          onClick={onOpenThreatModel}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-[#8FA899] text-[#13241A] hover:bg-[#EDF3EF] transition-colors cursor-pointer font-tech text-[10px] uppercase tracking-wider font-bold"
          title="View Agentic Threat Model & Countermeasures"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-[#2D6A4F]" />
          <span>[SEC-AUDIT]</span>
        </button>

        {/* New Tab */}
        <button
          id="nav-open-new-window-btn"
          onClick={handleOpenNewWindow}
          className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-[#8FA899] text-[#13241A] hover:bg-[#EDF3EF] transition-colors cursor-pointer font-tech text-[10px] uppercase tracking-wider"
          title="Open in new window / tab"
        >
          <ExternalLink className="w-3 h-3 text-[#2D6A4F]" />
          <span>TAB</span>
        </button>

        {/* Session Holder Identity */}
        <div className="text-right pl-2 border-l border-[#8FA899] flex items-center gap-2">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || "User"}
              className="w-7 h-7 border border-[#8FA899] object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-7 h-7 bg-[#13241A] text-white flex items-center justify-center text-xs font-tech font-bold">
              {(user.displayName || user.email || "U").charAt(0).toUpperCase()}
            </div>
          )}
          <div className="hidden sm:block text-left">
            <span className="block font-tech text-[9px] uppercase tracking-[0.1em] text-[#526E5D] leading-none font-bold">
              UID / AUTH
            </span>
            <p className="font-mono text-xs font-semibold text-[#13241A] leading-tight truncate max-w-[130px]">
              {user.displayName || user.email?.split("@")[0] || "Akshansh Agrawal"}
            </p>
          </div>
        </div>

        {/* Sign Out Button */}
        <button
          id="sign-out-btn"
          onClick={onSignOut}
          className="p-1.5 bg-white border border-[#8FA899] hover:border-rose-600 hover:text-rose-700 text-[#526E5D] transition-colors cursor-pointer"
          title="Sign out of your account"
          aria-label="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
