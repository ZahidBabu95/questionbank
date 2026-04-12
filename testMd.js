import React from 'react';
import { renderToString } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

const md = '![চিত্র](https://pub-877664dc8f4f473da7cdcb7fe3b32a76.r2.dev/ai_imports/images/job_d8b8509e-57eb-4230-8c8b-9a656b6db4f1/62d9fc29-7b2e-4edf-b7c5-447f3dc58bfe.png)';

console.log(renderToString(<ReactMarkdown rehypePlugins={[rehypeRaw]}>{md}</ReactMarkdown>));
