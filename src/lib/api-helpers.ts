

type ValueMap = { [key: string]: string | number | undefined };

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
        let rawValue: any;
        let isOptional = false;

        if (typeof paramConfig === 'object' && paramConfig !== null && 'value' in paramConfig) {
            rawValue = paramConfig.value;
            isOptional = paramConfig.optional === true;
        } else {
            rawValue = paramConfig;
        }

        let paramValue: string | undefined = undefined;

        if (typeof rawValue === 'string' && rawValue.startsWith('$')) {
            const varName = rawValue.substring(1);
            if (varName in valueMap && valueMap[varName]) {
              paramValue = valueMap[varName]?.toString();
            } else if (env[varName]){
              paramValue = env[varName];
            }
        } else {
            paramValue = rawValue?.toString();
        }
        
        if (paramValue || !isOptional) {
             urlParams.append(key, paramValue || '');
        }
    }
    
    const paramsString = urlParams.toString();
    if (paramsString) {
        return `${finalUrlString}?${paramsString}`;
    }
    return finalUrlString;
}

    