import React, { useState } from 'react';
import { PipelineAssets, PipelineScores } from '../types.js';
import { 
  Copy, 
  Check, 
  Download, 
  Sparkles, 
  ExternalLink, 
  ShieldCheck, 
  Image as ImageIcon,
  CheckCircle,
  Eye,
  Zap
} from 'lucide-react';

interface AssetShowcaseProps {
  assets: PipelineAssets;
  scores?: PipelineScores;
  productIdea: string;
  onOpenImageEditor?: (imageUrl: string) => void;
  onOpenVeoAnimator?: (imageUrl: string, prompt: string) => void;
}

export const AssetShowcase: React.FC<AssetShowcaseProps> = ({
  assets,
  scores,
  productIdea,
  onOpenImageEditor,
  onOpenVeoAnimator,
}) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [showPromptModal, setShowPromptModal] = useState(false);

  const handleCopy = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleDownloadImage = () => {
    const link = document.createElement('a');
    link.href = assets.image_url;
    link.download = `product-asset-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
      {/* Decorative ambient gradient */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-sky-500/10 via-indigo-500/5 to-transparent blur-3xl pointer-events-none" />

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 text-xs font-bold uppercase tracking-wider rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Verified Assets
            </span>
            {scores && (
              <span className="flex items-center space-x-1 text-xs text-slate-300 font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Overall Quality: <strong className="text-emerald-300">{scores.overall}/10</strong></span>
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight mt-1">
            Production-Ready Multimodal Asset Package
          </h2>
        </div>

        <button
          onClick={() => handleCopy(
            `TAGLINE:\n${assets.tagline}\n\nHEADLINE:\n${assets.marketing_copy.headline}\n\nBODY:\n${assets.marketing_copy.body}\n\nBENEFITS:\n${assets.marketing_copy.key_benefits.map(b => `- ${b}`).join('\n')}\n\nCTA: ${assets.marketing_copy.call_to_action}`,
            'all'
          )}
          className="inline-flex items-center space-x-2 px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all shadow-sm cursor-pointer"
        >
          {copiedSection === 'all' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          <span>{copiedSection === 'all' ? 'Copied Full Package!' : 'Copy All Content'}</span>
        </button>
      </div>

      {/* Tagline Spotlight */}
      <div className="mt-6 p-5 bg-gradient-to-r from-indigo-950/40 via-slate-900/80 to-slate-950/60 border border-indigo-500/30 rounded-xl relative group">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-indigo-400 font-bold">
              Brand Tagline (gemini-3.8-flash)
            </span>
            {scores?.tagline && (
              <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                Score: {scores.tagline.score}/10
              </span>
            )}
          </div>
          <button
            onClick={() => handleCopy(assets.tagline, 'tagline')}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1 cursor-pointer"
            title="Copy tagline"
          >
            {copiedSection === 'tagline' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
        <div className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-sky-200 to-indigo-200 tracking-tight py-1">
          &ldquo;{assets.tagline}&rdquo;
        </div>
        {scores?.tagline?.reasoning && (
          <p className="mt-2 text-xs text-slate-400 border-t border-slate-800/80 pt-2 italic">
            Evaluator: &ldquo;{scores.tagline.reasoning}&rdquo;
          </p>
        )}
      </div>

      {/* Content Grid: Copy (Left) + Image (Right) */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Marketing Copy */}
        <div className="lg:col-span-7 space-y-5">
          <div className="p-5 bg-slate-950/70 border border-slate-800 rounded-xl relative group">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                  Marketing Copy (gemini-3.8-flash)
                </span>
                {scores?.marketing_copy && (
                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    Score: {scores.marketing_copy.score}/10
                  </span>
                )}
              </div>
              <button
                onClick={() => handleCopy(`${assets.marketing_copy.headline}\n\n${assets.marketing_copy.body}`, 'copy')}
                className="text-slate-400 hover:text-slate-200 transition-colors p-1 cursor-pointer"
                title="Copy headline and body"
              >
                {copiedSection === 'copy' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <h3 className="text-lg sm:text-xl font-bold text-slate-100 mb-3 tracking-tight">
              {assets.marketing_copy.headline}
            </h3>

            <p className="text-sm text-slate-300 leading-relaxed font-normal mb-5">
              {assets.marketing_copy.body}
            </p>

            {/* Benefits */}
            <div className="space-y-2 mb-5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
                Engineered Value Pillars
              </span>
              {assets.marketing_copy.key_benefits.map((benefit, idx) => (
                <div key={idx} className="flex items-start space-x-2.5 text-xs text-slate-300">
                  <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle className="w-2.5 h-2.5" />
                  </div>
                  <span className="leading-snug">{benefit}</span>
                </div>
              ))}
            </div>

            {/* CTA button */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-mono">Suggested Call to Action</span>
                <span className="text-xs font-semibold text-slate-300">{assets.marketing_copy.call_to_action}</span>
              </div>
              <button
                onClick={() => handleCopy(assets.marketing_copy.call_to_action, 'cta')}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-900 font-bold text-xs rounded-lg shadow-md shadow-emerald-950 transition-all cursor-pointer flex items-center space-x-1.5"
              >
                <span>{assets.marketing_copy.call_to_action}</span>
                <Zap className="w-3 h-3 fill-slate-900" />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Product Image */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="p-5 bg-slate-950/70 border border-slate-800 rounded-xl flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-sky-400 font-bold">
                    Product Visual (gemini-3.1-flash-lite-image)
                  </span>
                  {scores?.image && (
                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      Score: {scores.image.score}/10
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowPromptModal(!showPromptModal)}
                  className="text-xs text-sky-400 hover:text-sky-300 flex items-center space-x-1 cursor-pointer font-medium"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Prompt</span>
                </button>
              </div>

              {/* Image Preview Canvas */}
              <div className="relative group rounded-xl overflow-hidden border border-slate-800 bg-slate-900 aspect-square shadow-inner flex items-center justify-center">
                <img
                  src={assets.image_url}
                  alt={productIdea}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    // Fallback to stylized SVG placeholder if broken
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-4">
                  <span className="text-[11px] text-slate-300 font-medium">
                    Nano Banana 2 Lite Render
                  </span>
                  <button
                    onClick={handleDownloadImage}
                    className="p-2 bg-slate-900/90 hover:bg-slate-800 text-slate-200 rounded-lg shadow-lg border border-slate-700 cursor-pointer"
                    title="Download high-res image"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Prompt accordion / footer */}
              <div className="mt-4 pt-3 border-t border-slate-800 text-xs">
                <div className="text-slate-400 text-[11px] mb-1 font-semibold">Visual Direction:</div>
                <p className="text-slate-300 text-xs line-clamp-2 italic">
                  &ldquo;{assets.image_prompt}&rdquo;
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <button
                    onClick={handleDownloadImage}
                    className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Asset</span>
                  </button>
                  <span className="text-[10px] font-mono text-slate-500">1024x1024 • 1:1 Aspect</span>
                </div>

                {/* Multimodal Studio Actions */}
                <div className="mt-3.5 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2">
                  {onOpenImageEditor && (
                    <button
                      onClick={() => onOpenImageEditor(assets.image_url)}
                      className="px-3 py-2 rounded-lg bg-pink-950/50 hover:bg-pink-900/60 border border-pink-800/50 text-pink-300 text-xs font-medium flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                      <span>Edit with Image Studio</span>
                    </button>
                  )}
                  {onOpenVeoAnimator && (
                    <button
                      onClick={() => onOpenVeoAnimator(assets.image_url, assets.image_prompt)}
                      className="px-3 py-2 rounded-lg bg-amber-950/50 hover:bg-amber-900/60 border border-amber-800/50 text-amber-300 text-xs font-medium flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>Animate with Veo 3</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

      </div>
    </div>
  );
};
