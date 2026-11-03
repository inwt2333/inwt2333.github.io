export function foodCandidates(meals) {
    return meals.flatMap(meal => meal.photos.flatMap(photo => {
        const dishes = photo.dishes?.length ? photo.dishes : photo.dish ? [{name: photo.dish}] : [];
        return (dishes.length ? dishes : [null]).map((dish, index) => ({id: JSON.stringify([meal.date, photo.file, index]), meal, photo, dish}));
    }));
}
export function drawWithoutRepeat(values, state = {}, random = Math.random) {
    if (!values.length) return {value: null, state: {remaining: [], last: null}};
    let remaining = (state.remaining || []).filter(value => values.includes(value));
    if (!remaining.length) remaining = [...values];
    const choices = remaining.length > 1 ? remaining.filter(value => value !== state.last) : remaining;
    const value = choices[Math.floor(random() * choices.length)];
    return {value, state: {remaining: remaining.filter(item => item !== value), last: value}};
}
export function boardPage(meals, page) {
    return Array.from({length: Math.min(3, meals.length)}, (_, i) => meals[(page * 3 + i) % meals.length]);
}
