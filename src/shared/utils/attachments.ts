/**
 * Determines the preview type for an attachment URL.
 * Shared by UserDashboard, ReviewerDashboard, and AdminDashboard.
 */
export const getAttachmentPreviewType = (url: string): 'image' | 'pdf' | 'other' => {
    const normalized = url.split('?')[0].toLowerCase();
    if (/\.(png|jpe?g|gif|webp|bmp|svg)$/.test(normalized)) return 'image';
    if (/\.pdf$/.test(normalized)) return 'pdf';
    return 'other';
};
