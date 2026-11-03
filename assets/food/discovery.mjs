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
export function randomBoardPhotos(meals, previous = [], random = Math.random) {
    const all = meals.flatMap(meal => meal.photos.map(photo => ({
        id: JSON.stringify([meal.date, photo.file]), meal, photo
    })));
    const pick = (items, count) => {
        const available = [...items], result = [];
        while (result.length < count && available.length) {
            result.push(available.splice(Math.floor(random() * available.length), 1)[0]);
        }
        return result;
    };
    const fresh = all.filter(item => !previous.includes(item.id));
    const selected = pick(fresh, Math.min(3, all.length));
    if (selected.length < Math.min(3, all.length)) {
        selected.push(...pick(all.filter(item => !selected.some(chosen => chosen.id === item.id)), 3 - selected.length));
    }
    return selected;
}
