import {useEffect, useState} from "react";

export interface UseWasmProps {
    url: string,
}

export type UseWasmType = {
    loading: boolean,
    error?: any,
    instance?: WebAssembly.Instance,
    module?: WebAssembly.Module
};

export const useWasm = (props: UseWasmProps) => {
    const {url} = props;
    const [state, setState] = useState<UseWasmType>({
        loading: true,
        error: undefined,
        instance: undefined,
        module: undefined
    });

    useEffect(() => {
        loadWasm(url);
    }, [url, setState]);

    const loadWasm = (url: string) => {
        WebAssembly.instantiateStreaming(fetch(url))
            .then(wasm => {
                setState({
                    loading: false,
                    error: undefined,
                    instance: wasm.instance,
                    module: wasm.module,
                });
            }).catch(ex => {
            setState({
                loading: false,
                error: ex,
                instance: undefined,
                module: undefined,
            });
        })
    };

    return state;
}