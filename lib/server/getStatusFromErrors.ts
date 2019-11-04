import { GqlErrors, GqlError } from '../utils/apolloClientErrorHandlers';

export function getStatusFromErrors(errors: GqlErrors[]): 200 | 404 | 500 {
    if (errors.length === 0) {
        return 200;
    }

    const hasOtherErrors = errors.some(e => e.type === GqlError.GqlError || e.type === GqlError.Network);
    const hasNotFoundError = errors.some(e => e.type === GqlError.NotFound);

    if (hasOtherErrors) {
        return 500;
    }

    if (hasNotFoundError) {
        return 404;
    }

    return 200;
}
