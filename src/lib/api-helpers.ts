

type ValueMap = { [key: string]: string | number | undefined };

function processQueryParam(paramConfig: any, valueMap: ValueMap): string | null {
    if (typeof paramConfig === 'object' && paramConfig !== null && Array.isArray(paramConfig.values)) {
        const parts = paramConfig.values.map((val: string) => {
            if (val.startsWith('$')) {
                const key = val.substring(1);
                return valueMap[key] || '';
            }
            return val;
        }).filter(Boolean); // Filtra partes vacías
        
        const separator = paramConfig.separator || ', ';
        return parts.length > 0 ? parts.join(separator) : null;
    }
    return null;
}

export function buildApiUrl(
    apiConfig: any,
    valueMap: ValueMap,
    env: NodeJS.ProcessEnv
): string {
    let finalUrlString = apiConfig.base_url;
    
    // Replace placeholders in the base_url itself
    for (const [key, value] of Object.entries(valueMap)) {
      if (typeof value === 'string') {
        finalUrlString = finalUrlString.replace(`$${key}`, encodeURIComponent(value));
      }
    }
    
    const urlParams = new URLSearchParams();

    for (const [key, paramConfig] of Object.entries(apiConfig.parameters || {})) {
        let paramValue: string | null = null;
        let isOptional = false;
        
        if (typeof paramConfig === 'object' && paramConfig !== null) {
            isOptional = paramConfig.optional === true;
            if (Array.isArray(paramConfig.values)) { // Handle complex query builder
                paramValue = processQueryParam(paramConfig, valueMap);
            } else {
                let rawValue = paramConfig.value;
                 if (typeof rawValue === 'string' && rawValue.startsWith('$')) {
                    const varName = rawValue.substring(1);
                    if (varName in valueMap && valueMap[varName] !== undefined) {
                      paramValue = String(valueMap[varName]);
                    } else if (env[varName]){
                      paramValue = env[varName];
                    }
                } else {
                    paramValue = rawValue?.toString();
                }
            }
        } else {
             let rawValue = paramConfig;
              if (typeof rawValue === 'string' && rawValue.startsWith('$')) {
                const varName = rawValue.substring(1);
                 if (varName in valueMap && valueMap[varName] !== undefined) {
                    paramValue = String(valueMap[varName]);
                } else if (env[varName]){
                    paramValue = env[varName];
                }
            } else {
                paramValue = rawValue?.toString();
            }
        }
        
        if (paramValue !== null && (paramValue !== '' || !isOptional)) {
             urlParams.append(key, paramValue);
        }
    }
    
    const paramsString = urlParams.toString();
    if (paramsString) {
        return `${finalUrlString}?${paramsString}`;
    }
    return finalUrlString;
}
