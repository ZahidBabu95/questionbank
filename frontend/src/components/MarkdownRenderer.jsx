import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';

const MarkdownRenderer = ({ content, className = '' }) => {
    if (!content) return null;

    // Fix line breaks for math blocks
    let processedContent = content
        .replace(/\n\$\$/g, '\n\n$$')
        .replace(/\$\$\n/g, '$$\n\n');

    // Attempt to convert markdown links that point to images into markdown images
    processedContent = processedContent.replace(/(?<!\!)\[([^\]]*)\]\((https?:\/\/[^\)]+(?:\.(?:jpeg|jpg|gif|png|webp|bmp|svg)|cloudflarestorage\.com)[^\)]*)\)/gi, '![$1]($2)');

    // Attempt to convert raw text URLs that point to images into markdown images
    // Wait, first ensure it is NOT preceded by ']' or '=' or '"' or ''' AND NOT preceded by '](' (which means it's already a markdown link or image)
    processedContent = processedContent.replace(/(?<!\]\()(?<![\]="'\w\/>])(https?:\/\/[^\s<]+(?:cloudflarestorage\.com|\.(?:jpeg|jpg|gif|png|webp|bmp|svg))[^\s<]*)/gi, '![image]($1)');

    return (
        <div className={`prose prose-sm max-w-none break-words ${className}
            prose-p:leading-relaxed prose-p:my-1
            prose-img:rounded-md prose-img:max-h-80 prose-img:w-auto prose-img:my-2
            prose-a:text-blue-600 hover:prose-a:text-blue-800`}>
            <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeRaw, rehypeKatex]}
                components={{
                    img: ({ node, ...props }) => (
                        <img {...props} referrerPolicy="no-referrer" className="max-w-full h-auto rounded-lg shadow-sm border border-slate-200 mt-2 mb-3 inline-block" />
                    ),
                    a: ({ node, ...props }) => {
                        const href = props.href || '';
                        if (href.match(/\.(jpeg|jpg|gif|png|webp|bmp|svg)(\?.*)?$/i) || href.includes('cloudflarestorage.com')) {
                            return <img src={href} alt={typeof props.children === 'string' ? props.children : 'Image link'} referrerPolicy="no-referrer" className="max-w-full h-auto rounded-lg shadow-sm border border-slate-200 mt-2 mb-3 inline-block" />;
                        }
                        return (
                            <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                {props.children}
                            </a>
                        );
                    },
                }}
            >
                {processedContent}
            </ReactMarkdown>
        </div>
    );
};

export default MarkdownRenderer;
