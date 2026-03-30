import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * This file is web-only and used to configure the root HTML for every web page during static rendering.
 * It strictly sets the background color of the HTML body to avoid the default white screen flash.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: `
          body, html, #root { 
            background-color: #0B0E14 !important; /* Forces dark theme instantly before JS loads */
            height: 100%;
            width: 100%;
          }
        ` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
