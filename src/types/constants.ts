import { FieldType } from "@grafana/data";

export const enum SumoQueryType{
    Logs = 'Logs',
    Metrics = 'Metrics'
}

export const SumoToGrafanaTypeMap : Record<string , FieldType> = {
    int : FieldType.number,
    double : FieldType.number,
    string : FieldType.string,
}

export const getSumoToGrafanaType  = (fieldName : string , fieldType : string) : FieldType =>{
    if(fieldName === '_timeslice'){
        return FieldType.time
    }

    return SumoToGrafanaTypeMap[fieldType] || FieldType.string;
}


export const formatSumoValues = (value : string, type : string)=>{
    if(type === 'int' || type === 'double' || type==='long'){
        return Number(value)
    }
    return value
}