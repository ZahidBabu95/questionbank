import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';

const MarkdownRenderer = ({ content, className = '' }) => {
    if (content === null || content === undefined) return null;

    let contentStr = '';
    if (typeof content === 'string') {
        contentStr = content;
    } else if (typeof content === 'object') {
        try {
            contentStr = JSON.stringify(content);
        } catch (e) {
            contentStr = String(content);
        }
    } else {
        contentStr = String(content);
    }

    if (!contentStr.trim()) return null;

    // Fix line breaks for math blocks
    let processedContent = contentStr
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
                    img: ({ node, ...props }) => {
                        let src = props.src || '';
                        if (src.includes('r2.dev') && !src.includes('proxy-image')) {
                            src = `/api/v1/public/proxy-image?url=${encodeURIComponent(src)}`;
                        }
                        return (
                            <span className="flex justify-center my-6 w-full">
                                <img 
                                    {...props} 
                                    src={src} 
                                    referrerPolicy="no-referrer" 
                                    className="max-w-[90%] md:max-w-[80%] h-auto rounded-lg shadow-md border border-slate-200/60 transition-transform duration-300 hover:scale-[1.02]" 
                                />
                            </span>
                        );
                    },
                    a: ({ node, ...props }) => {
                        let href = props.href || '';
                        if (href.match(/\.(jpeg|jpg|gif|png|webp|bmp|svg)(\?.*)?$/i) || href.includes('cloudflarestorage.com') || href.includes('r2.dev')) {
                            let src = href;
                            if (src.includes('r2.dev') && !src.includes('proxy-image')) {
                                src = `/api/v1/public/proxy-image?url=${encodeURIComponent(src)}`;
                            }
                            return (
                                <span className="flex justify-center my-6 w-full">
                                    <img 
                                        src={src} 
                                        alt={typeof props.children === 'string' ? props.children : 'Image link'} 
                                        referrerPolicy="no-referrer" 
                                        className="max-w-[90%] md:max-w-[80%] h-auto rounded-lg shadow-md border border-slate-200/60 transition-transform duration-300 hover:scale-[1.02]" 
                                    />
                                </span>
                            );
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
