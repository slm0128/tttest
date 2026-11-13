// Landing-Page-Animation:
// Auf der Startseite gibt es einen Rezept-Carousel, der automatisch scrollt,
// aber bei Interaktion pausiert, damit Nutzer*innen das Karussell sauber nutzen können.
const recipeCarousel = document.querySelector('#recipeCarousel');
const recipeTrack = recipeCarousel?.querySelector('.landing-recipe-track');

if (recipeTrack && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const recipeSlides = [...recipeTrack.querySelectorAll('.landing-recipe-slide')];

    if (recipeSlides.length > 1) {
        let isAutoScrolling = false;
        let resumeAfter = 0;

        // Wenn der Nutzer mit dem Karussell interagiert, pausiert die automatische Rotation kurz.
        const pauseAfterInteraction = () => {
            resumeAfter = Date.now() + 7000;
        };

        recipeCarousel.addEventListener('pointerdown', pauseAfterInteraction, { passive: true });
        recipeCarousel.addEventListener('touchstart', pauseAfterInteraction, { passive: true });
        recipeCarousel.addEventListener('wheel', pauseAfterInteraction, { passive: true });
        recipeCarousel.addEventListener('focusin', pauseAfterInteraction);

        // Automatisches Scrollen alle 3 Sekunden, sofern die Sektion sichtbar ist und nicht pausiert wurde.
        window.setInterval(() => {
            const carouselBounds = recipeCarousel.getBoundingClientRect();
            const isVisible = carouselBounds.bottom > 0 && carouselBounds.top < window.innerHeight;
            if (!isVisible || document.hidden || recipeCarousel.matches(':hover')
                || recipeCarousel.contains(document.activeElement) || Date.now() < resumeAfter || isAutoScrolling) {
                return;
            }

            const maxScroll = recipeTrack.scrollWidth - recipeTrack.clientWidth;
            if (maxScroll <= 0) {
                return;
            }

            const currentScroll = recipeTrack.scrollLeft;
            const nextScroll = currentScroll >= maxScroll - 8
                ? 0
                : Math.min(currentScroll + recipeTrack.clientWidth, maxScroll);

            isAutoScrolling = true;
            recipeTrack.scrollTo({ left: nextScroll, behavior: 'smooth' });
            window.setTimeout(() => {
                isAutoScrolling = false;
            }, 900);
        }, 3000);
    }
}