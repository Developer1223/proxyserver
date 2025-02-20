import express from 'express';
import { createProxyMiddleware, responseInterceptor } from 'http-proxy-middleware';
import { load } from 'cheerio';
import { HttpsProxyAgent } from 'https-proxy-agent';

const app = express();
const proxyUrl = 'http://52.15.64.91:3128'; // Squid proxy address
const targetUrl = 'https://www.xbox.com/en-US/play'; // Xbox Cloud Gaming URL

app.use('/gaming', createProxyMiddleware({
  target: targetUrl,
  changeOrigin: true,
  selfHandleResponse: true, // Allows interception of the response.
  onProxyRes: responseInterceptor(async (responseBuffer, proxyRes, req, res) => {
    // Check if the response is HTML
    const contentType = proxyRes.headers['content-type'];
    if (contentType && contentType.includes('text/html')) {
      const response = responseBuffer.toString('utf8');
      const $ = load(response);

      // Rewrite all anchor tags to prepend '/gaming' if they point to the target domain.
      $('a').each(function() {
        let link = $(this).attr('href');
        if (link && link.startsWith('https://www.xbox.com/en-US/play')) {
          // Remove the base URL and prepend /gaming
          const newPath = link.replace('https://www.xbox.com/en-US/play', '');
          $(this).attr('href', '/gaming' + newPath);
        } else if (link && link.startsWith('/')) {
          $(this).attr('href', '/gaming' + link);
        }
      });
      return $.html();
    }
    return responseBuffer;
  }),
  // Outbound requests will go through the Squid proxy:
  agent: new HttpsProxyAgent(proxyUrl)
}));

app.listen(3000, () => console.log('Server running on port 3000'));
