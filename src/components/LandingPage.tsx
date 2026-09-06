import React, { useState } from "react";
import {
  Wallet,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Lock,
  RefreshCw,
  Coins,
  FileText,
  PieChart,
  ExternalLink,
} from "lucide-react";

interface LandingPageProps {
  onSignInWithGoogle: () => Promise<void>;
  onOpenThreatModel: () => void;
  onClearAuthError?: () => void;
  authLoading: boolean;
  authError: string | null;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onSignInWithGoogle,
  onOpenThreatModel,
  onClearAuthError,
  authLoading,
  authError,
}) => {
  const [signingIn, setSigningIn] = useState(false);

  const handleSignIn = async () => {
    try {
      setSigningIn(true);
      await onSignInWithGoogle();
    } finally {
      setSigningIn(false);
    }
  };

  const handleOpenNewWindow = () => {
    window.open(window.location.href, "_blank");
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F8F7F4] text-[#16241C] selection:bg-[#2E7D52]/20 selection:text-[#16241C]">
      {/* Top Navbar */}
      <header className="w-full border-b border-[#16241C] bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#16241C] text-white flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-serif font-normal text-xl tracking-tight text-[#16241C]">
                FinSight
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 border border-[#16241C]/30 text-[#16241C]">
                Sage & Clarity
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 font-mono text-xs uppercase tracking-wider">
            <button
              id="open-new-window-btn"
              onClick={handleOpenNewWindow}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-[#16241C]/30 hover:border-[#16241C] bg-white text-[#16241C] transition-colors cursor-pointer"
              title="Open app in full window to ensure Google popup works smoothly"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#2E7D52]" />
              <span className="hidden sm:inline">Open New Tab</span>
            </button>

            <button
              id="landing-threat-model-btn"
              onClick={onOpenThreatModel}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-[#16241C]/30 hover:border-[#16241C] bg-white text-[#16241C] transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#2E7D52]" />
              <span className="hidden sm:inline">Security Architecture</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 sm:py-16 max-w-4xl mx-auto text-center relative">
        {/* Top badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 font-mono text-[10px] uppercase tracking-wider mb-6 bg-white border border-[#16241C] text-[#16241C]">
          <Sparkles className="w-3.5 h-3.5 text-[#2E7D52]" />
          <span>Mindful Financial Reflection powered by Gemini & Firestore</span>
        </div>

        {/* Main Heading */}
        <h1 className="text-3xl sm:text-5xl font-serif font-normal tracking-tight leading-[1.18] max-w-2xl text-[#16241C]">
          A serene space for your financial reflections and daily spending.
        </h1>

        {/* Subtitle */}
        <p className="mt-4 text-base sm:text-lg max-w-xl leading-relaxed text-[#16241C]/70 font-sans">
          Write naturally in any currency. FinSight gently organizes your expenses, translates foreign currencies with live FX rates, and surfaces peaceful clarity.
        </p>

        {/* Interactive Live Sample Reflection Card */}
        <div className="mt-8 w-full max-w-lg p-5 border border-[#16241C] bg-white text-left space-y-3 shadow-md">
          <div className="flex items-center justify-between font-mono text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-[#2E7D52]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#16241C]">
                Live Journal Example
              </span>
            </div>
            <span className="text-[10px] text-[#16241C]/60">Just now</span>
          </div>

          <p className="font-serif text-sm text-[#16241C] italic bg-[#F8F7F4] p-3 border border-[#16241C]/15">
            &ldquo;Paid €42.50 for an artisan dinner in Rome with old colleagues [Daily Comfort]&rdquo;
          </p>

          <div className="flex items-center justify-between gap-2 flex-wrap pt-1 font-mono">
            <div className="flex items-center gap-1.5 flex-wrap text-[10px] uppercase tracking-wider">
              <span className="px-2 py-0.5 border border-[#16241C]/30 text-[#16241C]">
                Food & Dining
              </span>
              <span className="px-2 py-0.5 border border-[#2E7D52] bg-[#E5F3EB] text-[#2E7D52]">
                On Track 🌿
              </span>
            </div>
            <div className="text-right">
              <span className="font-serif text-base font-normal text-[#16241C]">
                $46.20 USD
              </span>
              <span className="text-[10px] text-[#16241C]/60 block">
                (from 42.50 EUR @ 1.087)
              </span>
            </div>
          </div>

          <p className="text-xs text-[#16241C]/80 leading-relaxed border-t border-[#16241C]/15 pt-2">
            <strong className="font-mono text-[10px] uppercase tracking-wider">Companion Guidance:</strong> Meaningful experiences with close colleagues align with your intentional leisure budget. Enjoy the moment.
          </p>
        </div>

        {/* Sign In Card */}
        <div className="mt-8 w-full max-w-md p-6 sm:p-8 border border-[#16241C] bg-white shadow-lg text-left">
          <div className="text-center mb-6">
            <h2 className="font-serif text-xl font-normal text-[#16241C]">
              Welcome to Your Private Journal
            </h2>
            <p className="font-mono text-xs mt-1 text-[#16241C]/60">
              Sign in with your Google account. Your entries are isolated strictly to your own user ID.
            </p>
          </div>

          {authError && (
            <div className="mb-5 p-3.5 border border-amber-300 bg-amber-50 text-amber-950 font-mono text-xs leading-relaxed flex flex-col gap-3">
              <div className="flex items-start gap-2">
                <span className="font-bold text-amber-900 shrink-0">Authentication Notice:</span>
                <span className="text-amber-900">{authError}</span>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-amber-200 text-xs">
                <button
                  type="button"
                  onClick={handleOpenNewWindow}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-amber-300 bg-amber-100 hover:bg-amber-200 text-amber-950 text-[10px] uppercase tracking-wider cursor-pointer"
                >
                  <ExternalLink className="w-3 h-3 text-amber-800" />
                  <span>Open in New Tab</span>
                </button>
                {onClearAuthError && (
                  <button
                    type="button"
                    onClick={onClearAuthError}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-white text-amber-900 text-[10px] uppercase tracking-wider border border-amber-300 cursor-pointer ml-auto"
                  >
                    <span>Dismiss</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Official Firebase Google Sign-In */}
          <button
            id="google-signin-btn"
            onClick={handleSignIn}
            disabled={signingIn}
            className="w-full flex items-center justify-center gap-3 font-mono text-xs uppercase tracking-wider font-semibold py-3 px-4 bg-[#16241C] hover:bg-[#253E2F] active:bg-[#14241B] text-white transition-all disabled:opacity-50 cursor-pointer"
          >
            {signingIn ? (
              <RefreshCw className="w-4 h-4 animate-spin text-[#88D4A8]" />
            ) : (
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Continue with Google</span>
            {!signingIn && <ArrowRight className="w-4 h-4 opacity-75 ml-auto" />}
          </button>

          <div className="mt-4 pt-4 border-t border-[#16241C]/15 flex items-center justify-center gap-1.5 font-mono text-[10px] text-[#16241C]/60 uppercase tracking-wider">
            <Lock className="w-3 h-3 opacity-70" />
            <span>Zero password handling • Owner-bound Firestore isolation</span>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full text-left">
          <div className="p-5 border border-[#16241C] bg-white">
            <div className="w-7 h-7 bg-[#16241C] text-white flex items-center justify-center mb-3">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <h3 className="font-serif text-base font-normal text-[#16241C]">
              Freeform Reflection
            </h3>
            <p className="text-xs mt-1 leading-relaxed text-[#16241C]/70">
              Write casually in any currency: &ldquo;Spent €45 on dinner with friends&rdquo; or &ldquo;Paid 15,000 JPY for train pass&rdquo;.
            </p>
          </div>

          <div className="p-5 border border-[#16241C] bg-white">
            <div className="w-7 h-7 bg-[#16241C] text-white flex items-center justify-center mb-3">
              <Coins className="w-3.5 h-3.5" />
            </div>
            <h3 className="font-serif text-base font-normal text-[#16241C]">
              Live FX Currency Bridge
            </h3>
            <p className="text-xs mt-1 leading-relaxed text-[#16241C]/70">
              Automated conversion to your chosen home currency without configuring third-party accounts or manual calculation.
            </p>
          </div>

          <div className="p-5 border border-[#16241C] bg-white">
            <div className="w-7 h-7 bg-[#16241C] text-white flex items-center justify-center mb-3">
              <PieChart className="w-3.5 h-3.5" />
            </div>
            <h3 className="font-serif text-base font-normal text-[#16241C]">
              Mindful Budget Guard
            </h3>
            <p className="text-xs mt-1 leading-relaxed text-[#16241C]/70">
              Identifies subscriptions, EMIs, or recurring lines and allows you to confirm budget ceilings with a single tap.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#16241C] py-4 px-4 text-center font-mono text-xs uppercase tracking-wider bg-white text-[#16241C]/60">
        <p>
          Designed for financial mindfulness • Securely powered by Gemini AI and Cloud Firestore
        </p>
      </footer>
    </div>
  );
};
