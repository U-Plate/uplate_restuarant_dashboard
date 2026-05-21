import { ArrowRight, ImageIcon, Salad } from 'lucide-react';
import type { Ad } from '../../types';
import { useApp } from '../../store/AppContext';

interface AdPreviewProps {
  ad: Pick<Ad, 'title' | 'description' | 'creativeUrl' | 'redirectUrl' | 'iconUrl'>;
  compact?: boolean;
}

export function AdPreview({ ad, compact }: AdPreviewProps) {
  const { state } = useApp();
  const iconUrl = ad.iconUrl ?? state.restaurant.iconUrl;
  const restaurantName = state.restaurant.name ?? 'Your Restaurant';
  if (compact) {
    return (
      <div
        style={{
          aspectRatio: '16 / 9',
          background: 'linear-gradient(135deg, var(--accent-20), var(--accent-12))',
          borderRadius: 'var(--r-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--accent)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {ad.creativeUrl ? (
          <img src={ad.creativeUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <ImageIcon size={28} />
        )}
        <div
          style={{
            position: 'absolute',
            top: 6,
            left: 6,
            width: 22,
            height: 22,
            borderRadius: 'var(--r-pill)',
            background: 'var(--surface)',
            color: 'var(--accent)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-sm)',
            overflow: 'hidden',
          }}
        >
          {iconUrl ? (
            <img src={iconUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <Salad size={12} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'transparent',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--s-3)',
      }}
    >
      <span
        style={{
          fontSize: 11,
          color: 'var(--text-soft)',
          fontWeight: 600,
          letterSpacing: 0.3,
          textTransform: 'uppercase',
        }}
      >
        Live Preview
      </span>
      <div
        style={{
          width: '100%',
          borderRadius: 16,
          background: '#0d121e',
          border: '1px solid rgba(255,255,255,0.06)',
          padding: '12px 14px',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: 'rgba(168, 185, 232, 0.157)',
            padding: '2px 6px',
            borderRadius: 6,
          }}
        >
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: '#a8b9e8',
              display: 'inline-block',
            }}
          />
          <span style={{ width: 5, display: 'inline-block' }} />
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: 0.8,
              color: '#a8b9e8',
            }}
          >
            SPONSORED
          </span>
        </div>

        <div style={{ height: 8 }} />

        <span
          style={{
            fontSize: 16,
            fontWeight: 700,
            lineHeight: 1.2,
            color: '#ffffff',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {ad.title || 'Your ad title'}
        </span>

        <div style={{ height: 6 }} />

        <span
          style={{
            fontSize: 12,
            lineHeight: 1.35,
            color: '#8a92a3',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {ad.description || 'A short, tasty description shows here.'}
        </span>

        <div style={{ height: 12 }} />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            gap: 8,
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              flex: 1,
              minWidth: 0,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                overflow: 'hidden',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                background: 'rgba(168, 185, 232, 0.2)',
              }}
            >
              {iconUrl ? (
                <img
                  src={iconUrl}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <Salad size={18} color="#a8b9e8" />
              )}
            </div>
            <span style={{ width: 8, display: 'inline-block' }} />
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                lineHeight: 1.1,
                color: '#ffffff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                minWidth: 0,
              }}
            >
              {restaurantName}
            </span>
          </div>
          <div
            style={{
              background: '#a8b9e8',
              padding: '6px 12px',
              borderRadius: 20,
              display: 'inline-flex',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#ffffff',
              }}
            >
              Order Now
            </span>
            <span style={{ width: 4, display: 'inline-block' }} />
            <ArrowRight size={14} color="#ffffff" strokeWidth={2.5} />
          </div>
        </div>

        {ad.creativeUrl && (
          <>
            <div style={{ height: 12 }} />
            <div
              style={{
                width: '100%',
                borderRadius: 10,
                overflow: 'hidden',
                aspectRatio: '16 / 9',
              }}
            >
              <img
                src={ad.creativeUrl}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
