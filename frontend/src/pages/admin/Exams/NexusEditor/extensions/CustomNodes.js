import Heading from '@tiptap/extension-heading';
import Paragraph from '@tiptap/extension-paragraph';

export const CustomHeading = Heading.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            'data-section-id': {
                default: null,
                parseHTML: element => element.getAttribute('data-section-id'),
                renderHTML: attributes => {
                    if (!attributes['data-section-id']) return {};
                    return { 'data-section-id': attributes['data-section-id'] };
                }
            },
            class: {
                default: null,
                parseHTML: element => element.getAttribute('class'),
                renderHTML: attributes => {
                    if (!attributes.class) return {};
                    return { class: attributes.class };
                }
            }
        }
    }
});

export const CustomParagraph = Paragraph.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            'data-section-id': {
                default: null,
                parseHTML: element => element.getAttribute('data-section-id'),
                renderHTML: attributes => {
                    if (!attributes['data-section-id']) return {};
                    return { 'data-section-id': attributes['data-section-id'] };
                }
            },
            class: {
                default: null,
                parseHTML: element => element.getAttribute('class'),
                renderHTML: attributes => {
                    if (!attributes.class) return {};
                    return { class: attributes.class };
                }
            }
        }
    }
});
