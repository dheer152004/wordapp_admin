import React, { useState, useEffect } from 'react';

function Chip({ children, color = '#eef2ff', text = '#3730a3' }) {
  return (
    <span style={{
      display: 'inline-block', padding: '4px 10px', borderRadius: 999,
      background: color, color: text, fontSize: 12, fontWeight: 500,
      marginRight: 6, marginBottom: 6,
    }}>
      {children}
    </span>
  );
}

function Label({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
      color: '#6b7280', marginBottom: 6,
    }}>
      {children}
    </div>
  );
}

export default function WordCard({ word, href }) {
  const [activeImage, setActiveImage] = useState(0);
  const [imgError, setImgError] = useState(false);

  useEffect(() => { setImgError(false); }, [activeImage, word]);

  if (!word) return null;

  const images = (Array.isArray(word.images) ? word.images : word.imageUrls || [])
    .map(image => typeof image === 'string' ? image : image?.imageUrl)
    .filter(Boolean);
  const mainImage = images[activeImage] || null;
  const credits = word['source&credits'];
  const videos = Array.isArray(word.videos) ? word.videos : [];
  const audios = Array.isArray(word.audios) ? word.audios : [];

  const content = (
    <div
      style={{
        padding: 24, borderRadius: 12, background: '#ffffff',
        boxShadow: '0 6px 18px rgba(15,23,42,0.06)',
        cursor: href ? 'pointer' : 'default',
        transition: 'box-shadow 0.15s',
        width: '100%', maxWidth: 960, boxSizing: 'border-box',
        margin: '0 auto',
      }}
      onMouseEnter={(e) => { if (href) e.currentTarget.style.boxShadow = '0 10px 24px rgba(15,23,42,0.12)'; }}
      onMouseLeave={(e) => { if (href) e.currentTarget.style.boxShadow = '0 6px 18px rgba(15,23,42,0.06)'; }}
    >
      <div style={{ display: 'flex', gap: 30, alignItems: 'flex-start', flexWrap: 'wrap' }}>
           <div style={{ flex: '0 0 320px', maxWidth: 320 }}>
          {mainImage && !imgError ? (
            <img
              src={mainImage}
              alt={word.word}
              onError={() => setImgError(true)}
              style={{ width: '100%', height: 'auto', maxHeight: 360, borderRadius: 8, objectFit: 'cover' }}
            />
          ) : (
            <div style={{
              width: '100%', height: 220, borderRadius: 10, background: '#f3f4f6',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: 8,
            }}>
              {mainImage ? (
                <>
                  <span>Image failed to load</span>
                  <span style={{ fontSize: 11, wordBreak: 'break-all', marginTop: 4 }}>{mainImage}</span>
                </>
              ) : 'No image'}
            </div>
          )}

          {images.length > 1 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              {images.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`${word.word} ${i + 1}`}
                  onClick={(e) => { e.stopPropagation(); setActiveImage(i); }}
                  onError={(e) => { e.target.style.opacity = 0.3; }}
                  style={{
                    width: 56, height: 56, objectFit: 'cover', borderRadius: 8,
                    cursor: 'pointer',
                    border: i === activeImage ? '2px solid #4338ca' : '2px solid transparent',
                  }}
                />
              ))}
            </div>
          )}
        </div>

         <div style={{ flex: '1 1 auto', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <h2 style={{ margin: '0 0 10px 0', fontSize: 26 }}>{word.word}</h2>
            {word.id != null && <Chip color="#f1f5f9" text="#475569">ID {word.id}</Chip>}
            {word.categoryId != null && <Chip color="#eef2ff" text="#4338ca">Category {word.categoryId}</Chip>}
          </div>

          <p style={{ margin: '0 0 14px 0', color: '#111827', fontSize: 15 }}>
            <strong>Meaning:</strong> {word.meaning}
          </p>

          {(word.wordType || word.expandedForm || word.partOfSpeech) && (
            <div style={{ marginBottom: 12 }}>
              {word.wordType && <Chip color="#e0f2fe" text="#075985">Type: {word.wordType}</Chip>}
              {word.partOfSpeech && <Chip color="#fef3c7" text="#92400e">Part of speech: {word.partOfSpeech}</Chip>}
              {word.expandedForm && <Chip color="#ecfccb" text="#3f6212">Expanded: {word.expandedForm}</Chip>}
            </div>
          )}

          {word.description && (
            <p style={{ margin: '0 0 12px 0' }}><strong>Description:</strong> {word.description}</p>
          )}

          {word.facts && word.facts.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <Label>Facts</Label>
              <div>{word.facts.map((f, i) => <Chip key={i} color="#fef9c3" text="#854d0e">{f}</Chip>)}</div>
            </div>
          )}

          {word.examples && word.examples.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <Label>Examples</Label>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {word.examples.map((e, i) => <li key={i} style={{ marginBottom: 4 }}>{e}</li>)}
              </ul>
            </div>
          )}

          {videos.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <Label>Videos</Label>
              <div style={{ display: 'grid', gap: 10 }}>
                {videos.map((item, i) => {
                  const url = typeof item === 'string' ? item : item?.videoUrl;
                  if (!url) return null;
                  const isExternalVideo = /youtube\.com|youtu\.be|vimeo\.com/i.test(url);
                  return isExternalVideo ? (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>
                      Open video {i + 1}
                    </a>
                  ) : (
                    <video key={i} src={url} controls style={{ width: '100%', maxWidth: 480, borderRadius: 8 }} />
                  );
                })}
              </div>
            </div>
          )}

          {audios.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <Label>Audios</Label>
              <div style={{ display: 'grid', gap: 8 }}>
                {audios.map((item, i) => {
                  const url = typeof item === 'string' ? item : item?.audioUrl;
                  return url ? <audio key={i} src={url} controls style={{ width: '100%', maxWidth: 480 }} /> : null;
                })}
              </div>
            </div>
          )}

          {word.relatedWordIds && word.relatedWordIds.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <Label>Related Words</Label>
              <div>
                {word.relatedWordIds.map((r, i) => {
                  let label = '#?';
                  if (r == null) {
                    label = '#?';
                  } else if (typeof r === 'number' || typeof r === 'string') {
                    label = `#${r}`;
                  } else if (typeof r === 'object') {
                    const id = r.id ?? r.wordId;
                    const name = r.word ?? r.name;
                    if (name && id != null) {
                      label = `${name} (#${id})`;
                    } else if (name) {
                      label = name;
                    } else if (id != null) {
                      label = `#${id}`;
                    }
                  }
                  return (
                    <Chip key={i} color="#dcfce7" text="#166534">{label}</Chip>
                  );
                })}
              </div>
            </div>
          )}

          {word.alsoAppearsIn && word.alsoAppearsIn.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <Label>Also Appears In</Label>
              <div>
                {word.alsoAppearsIn.map((a, i) => {
                  const category = a.categoryName || a.categoryId;
                  const wordLabel = a.word ?? a.wordId ?? 'unknown';
                  return (
                    <Chip key={i} color="#fae8ff" text="#86198f">
                      {category} · {wordLabel}
                    </Chip>
                  );
                })}
              </div>
            </div>
          )}

          {credits && (
            <div style={{ marginTop: 8 }}>
              <Label>Source & Credits</Label>
              <div>
                {credits.author && <Chip color="#f3f4f6" text="#374151">by {credits.author}</Chip>}
                {credits.platform && <Chip color="#f3f4f6" text="#374151">{credits.platform}</Chip>}
                {credits.type && <Chip color="#f3f4f6" text="#374151">{credits.type}</Chip>}
                {credits.licences && <Chip color="#f3f4f6" text="#374151">{credits.licences}</Chip>}
                {credits.url && (
                  <a
                    href={credits.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{ fontSize: 12, color: '#2563eb', marginLeft: 4 }}
                  >
                    view source ↗
                  </a>
                )}
              </div>
            </div>
          )}

          <div style={{ marginTop: 12, color: '#6b7280', fontSize: 13, display: 'flex', gap: 12 }}>
            {word.created && <span>Created: {new Date(word.created).toLocaleDateString()}</span>}
            {word.updated && <span>Updated: {new Date(word.updated).toLocaleDateString()}</span>}
          </div>
        </div>
      </div>
    </div>
  );

  return href ? (
    <a href={href} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
      {content}
    </a>
  ) : content;
}