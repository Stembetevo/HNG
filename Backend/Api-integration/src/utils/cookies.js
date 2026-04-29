export function parseCookies(cookieHeader = "") {
    return cookieHeader.split(";").reduce((cookies, pair) => {
        const index = pair.indexOf("=");

        if (index === -1) {
            return cookies;
        }

        const rawKey = pair.slice(0, index).trim();
        const rawValue = pair.slice(index + 1).trim();

        let key = rawKey;
        let value = rawValue;

        try {
            key = decodeURIComponent(rawKey);
        } catch {
            // Keep raw key when percent-decoding fails.
            key = rawKey;
        }

        try {
            value = decodeURIComponent(rawValue);
        } catch {
            // Keep raw value when percent-decoding fails.
            value = rawValue;
        }

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
