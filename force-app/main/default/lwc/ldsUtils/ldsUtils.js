/**
 * Reduces one or more LDS errors into a string[] of error messages.
 * @param {FetchResponse|FetchResponse[]} errors
 * @return {String[]} Error messages
 */
export function reduceErrors(errors) {
    if (!Array.isArray(errors)) {
        errors = [errors];
    }

    return (
        errors
            // Remove null/undefined items
            .filter((error) => !!error)
            // Extract error messages
            .map((error) => {
                // UI API read errors
                if (Array.isArray(error.body)) {
                    return error.body.map((e) => e.message);
                }
                // Validation rule errors
                else if (error.body && error.body.fieldErrors && Object.keys(error.body.fieldErrors).length > 0) {
                    const fieldErrors = Object.values(error.body.fieldErrors);
                    return fieldErrors.map(fieldError => fieldError[0].message);
                }
                // Page level errors
                else if (error.body && error.body.pageErrors && error.body.pageErrors.length > 0) {
                    return error.body.pageErrors.map(e => e.message);
                }
                // Standard error message
                else if (error.body && error.body.message) {
                    return error.body.message;
                }
                // JS errors
                else if (typeof error === 'string') {
                    return error;
                }
                // Unknown error shape
                return 'Unknown error';
            })
            // Flatten arrays and remove empty strings
            .flat()
            .filter((message) => !!message)
    );
}