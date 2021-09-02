

export function formatPythonData(value: string, type: string) : string {
    switch (type) {
        case 'str':
            return `"${value}"`;
        case 'bool':
            return value;
        default:
            return `${value} (${type})`;
    }
}