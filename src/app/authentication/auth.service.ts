import { Logger, LogLevel, UserAgentApplication } from 'msal';
import { AppComponent } from '../app.component';

const { ClientId, appInsights, instrumentationKey } = (window as any);

function loggerCallback(level: LogLevel, message: string) {
    // Track appInsight's events when the instrumentation key is defined
    if (instrumentationKey !== undefined) {
        appInsights.trackEvent('GE-Classic: MSAL', message);
    }
}
const logger = new Logger(loggerCallback, { level: LogLevel.Verbose, correlationId: '1234'});

const config: any = {
    auth: {
        clientId: ClientId,
    },
    cache: {
        cacheLocation: 'localStorage',
        storeAuthStateInCookie: true,
    },
    system: {
        logger,
    },
};
const app = new UserAgentApplication(config);

// Register Callbacks for redirect flow
app.handleRedirectCallbacks(acquireTokenRedirectCallBack, acquireTokenErrorRedirectCallBack);

export function logout() {
    app.logout();
}

export async function login() {
    const loginRequest = {
        scopes: generateUserScopes(),
        prompt: 'select_account',
    };

    try {
        const response = await app.loginRedirect(loginRequest);
        return response;
    } catch (error) {
        // tslint:disable-next-line
        console.log(error);
    }
}

export async function getTokenSilent(scopes: any = []) {
    const hasScopes = (scopes.length > 0);
    let listOfScopes = AppComponent.Options.DefaultUserScopes;
    if (hasScopes) {
        listOfScopes = scopes;
    }
    try {
        const response = await app.acquireTokenSilent({ scopes: generateUserScopes(listOfScopes) });
        if (response.accessToken) {
            return response;
        }
        return null;
    } catch (error) {
        return null;
    }
}

export async function acquireNewAccessToken(scopes: string[] = []) {
    const hasScopes = (scopes.length > 0);
    let listOfScopes = AppComponent.Options.DefaultUserScopes;
    if (hasScopes) {
        listOfScopes = scopes;
    }
    try {
        try {
            app.acquireTokenRedirect({ scopes: generateUserScopes(listOfScopes) });
        } catch (error) {
            return null;
        }
    } catch (error) {
        return null;
    }
}

export async function getScopes() {
    let scopes = [];
    try {
        const response = await getTokenSilent();
        if (response.scopes) {
            scopes = response.scopes;
        }
    } catch (error) {
        return scopes;
    }
    if (scopes.length > 0) {
        const scopesLowerCase = scopes.map((item) => {
            return item.toLowerCase();
        });
        return scopesLowerCase;
    }
    return scopes;
}

export function generateUserScopes(userScopes = AppComponent.Options.DefaultUserScopes) {
    const graphMode = JSON.parse(localStorage.getItem('GRAPH_MODE'));
    if (graphMode === null) {
        return userScopes;
    }
    const graphUrl = localStorage.getItem('GRAPH_URL');
    const reducedScopes = userScopes.reduce((newScopes, scope) => {
        if (scope === 'openid' || scope === 'profile') {
            return newScopes += scope + ' ';
        }
        return newScopes += graphUrl + '/' + scope + ' ';
    }, '');

    const scopes = reducedScopes.split(' ').filter((scope) => {
        return scope !== '';
    });
    return scopes;
}

function requiresInteraction(errorCode) {
    if (!errorCode || !errorCode.length) {
        return false;
    }
    return errorCode === 'consent_required' ||
        errorCode === 'interaction_required' ||
        errorCode === 'login_required';
}

function acquireTokenRedirectCallBack(response) {
    if (response && response.tokenType === 'access_token') {
        return response.accessToken;
    }
}

function acquireTokenErrorRedirectCallBack(error) {
    // tslint:disable-next-line:no-console
    console.log(error);
}

export function getLoginType() {
    const ua = window.navigator.userAgent;
    const msie = ua.indexOf('MSIE ');
    const msie11 = ua.indexOf('Trident/');
    const msedge = ua.indexOf('Edge/');
    const isIE = msie > 0 || msie11 > 0;
    const isEdge = msedge > 0;
    return isIE || isEdge ? 'REDIRECT' : 'POPUP';
}
