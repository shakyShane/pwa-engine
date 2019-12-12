import zenscroll from 'zenscroll';

/**
 * @param scrollDuration
 * @param selector
 */
export function scrollToTopEffect(scrollDuration: number, selector: string) {
    const element = document.querySelector(selector);
    if (element) {
        zenscroll.to(element, scrollDuration);
    }
}
