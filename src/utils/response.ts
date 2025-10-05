export function api_response<T>(
    type: string,
    data: T,
    message: string = 'Data retrieved successfully'
): { type: string; message: string; data: T } {
    return {
        type,
        message,
        data,
    };
}
