

export function formatPythonData(value: string, type: string) : string {
    switch (type) {
        case 'str':
            return `"${value}" (str)`;
        case 'bool':
        case 'NoneType':
            return value;
        default:
            return `${value} (${type})`;
    }
}