export function parseCookies(cookieHeader = "") {
    return cookieHeader.split(";").reduce((cookies, pair) => {
        const index = pair.indexOf("=");

        if (index === -1) {
            return cookies;
        }

        const key = decodeURIComponent(pair.slice(0, index).trim());
        const value = decodeURIComponent(pair.slice(index + 1).trim());

        if (key) {
            cookies[key] = value;
        }

        return cookies;
    }, {});
}

export function hasAuthCookies(cookieHeader = "") {
    const cookies = parseCookies(cookieHeader);
    return Boolean(cookies.access_token || cookies.refresh_token);
}
