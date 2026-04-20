import React, { useMemo } from 'react';

interface LivePreviewProps {
  html: string;
  css: string;
}

export const LivePreview: React.FC<LivePreviewProps> = ({ html, css }) => {
  const srcDoc = useMemo(() => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            ${css}
            body { 
              font-family: system-ui, -apple-system, sans-serif; 
              padding: 1rem; 
              margin: 0;
            }
          </style>
        </head>
        <body>
          ${html}
        </body>
      </html>
    `;
  }, [html, css]);

  return (
    <div className="w-full h-full bg-white overflow-hidden flex flex-col relative">
      <iframe
        title="preview"
        srcDoc={srcDoc}
        className="w-full h-full border-none"
        sandbox="allow-scripts"
      />
    </div>
  );
};
