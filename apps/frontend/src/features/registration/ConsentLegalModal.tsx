import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ui } from '../../ui/tokens';
import { CONSENT_PARTICIPATION_LEGAL_FONT_SIZE_PX } from './consentParticipationLegalRu';

const FONT_DRUK = "'Druk Wide Cyr', 'Oswald', system-ui, sans-serif";

type Props = {
  open: boolean;
  title: string;
  content: string;
  onClose: () => void;
};

/**
 * Модалка «Ознакомиться» с правилами / согласием (Figma 952:1341+).
 * Прокрутка: flex + minHeight:0 + overflow; touch для iPad.
 */
export function ConsentLegalModal({ open, title, content, onClose }: Props) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const paragraphs = content
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || typeof document === 'undefined') return;

    const body = document.body;
    const html = document.documentElement;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyOverscroll = body.style.overscrollBehavior;
    const prevBodyTouchAction = body.style.touchAction;
    const prevHtmlOverflow = html.style.overflow;
    const prevHtmlOverscroll = html.style.overscrollBehavior;

    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';
    body.style.touchAction = 'none';
    html.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';

    return () => {
      body.style.overflow = prevBodyOverflow;
      body.style.overscrollBehavior = prevBodyOverscroll;
      body.style.touchAction = prevBodyTouchAction;
      html.style.overflow = prevHtmlOverflow;
      html.style.overscrollBehavior = prevHtmlOverscroll;
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(16px, 3vw, 48px)',
        boxSizing: 'border-box',
        overscrollBehavior: 'contain',
        touchAction: 'none',
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{
          width: 'min(2120px, 90vw)',
          maxWidth: '100%',
          maxHeight: 'min(1337px, 82vh)',
          minHeight: 0,
          height: 'auto',
          backgroundColor: '#121213',
          borderRadius: 50,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxSizing: 'border-box',
          boxShadow: '0 24px 80px rgba(0,0,0,0.55)',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 24,
            padding: 'clamp(24px, 2.5vw, 48px)',
            flexShrink: 0,
          }}
        >
          <h2
            id={titleId}
            style={{
              margin: 0,
              fontSize: 'clamp(28px, 2.2vw, 48px)',
              fontWeight: 400,
              lineHeight: 1.5,
              color: ui.color.text,
              textTransform: 'uppercase',
              flex: 1,
              minWidth: 0,
              fontFamily: 'inherit',
            }}
          >
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            aria-label="Закрыть"
            onClick={onClose}
            className="ar-reg-consent-modal-close"
            style={{
              flexShrink: 0,
              width: 80,
              height: 80,
              maxWidth: 'min(80px, 12vw)',
              maxHeight: 'min(80px, 12vw)',
              borderRadius: 31,
              border: 'none',
              backgroundColor: ui.color.red,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 12,
              boxSizing: 'border-box',
            }}
          >
            <svg
              width={36}
              height={36}
              viewBox="0 0 24 24"
              aria-hidden
              style={{ display: 'block' }}
            >
              <path
                d="M6 6L18 18M18 6L6 18"
                stroke={ui.color.text}
                strokeWidth={2.2}
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>
        <div
          className="ar-reg-consent-modal-scroll"
          style={{
            flex: '1 1 0%',
            minHeight: 0,
            overflowY: 'scroll',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
            overscrollBehaviorY: 'contain',
            touchAction: 'pan-y',
            padding: `0 clamp(24px, 2.5vw, 48px) clamp(24px, 2.5vw, 48px)`,
          }}
        >
          {paragraphs.map((block, i) => (
            <p
              key={i}
              style={{
                margin: i === paragraphs.length - 1 ? 0 : '0 0 1.1em',
                fontSize: CONSENT_PARTICIPATION_LEGAL_FONT_SIZE_PX,
                lineHeight: 1.35,
                color: 'rgba(255, 255, 255, 0.92)',
                textTransform: 'uppercase',
                fontWeight: 400,
                fontFamily: FONT_DRUK,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {block}
            </p>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
