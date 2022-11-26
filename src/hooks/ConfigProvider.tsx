import React, { createContext, useContext } from 'react'
import { LOGIN_TYPE } from '@toruslabs/torus-embed'

import { WalletProviders } from '.'

type Config = {
    apiProvider: boolean
    walletProviders: WalletProviders[]
    socialLogin: boolean
    socialLoginVerifiers: LOGIN_TYPE[]
    title: string
    networkType: 'mainnet' | 'testnet'
    blockchain: 'ethereum' | 'polygon'
    contractAddress: string
    currency: 'BRL' | 'USD'
    mainColor: string 
}

interface IConfigContext{
    config: Config
}

type ConfigProviderProps = {
    children: React.ReactNode
    config: Config
}

const ConfigContext = createContext<IConfigContext>({} as IConfigContext)

export const ConfigProvider = ({children, config}: ConfigProviderProps) => {
    return (
        <ConfigContext.Provider value={{config}}>{children}</ConfigContext.Provider>
    )
}

export const useConfig = () => {
    const context = useContext(ConfigContext)
    if (context === undefined){
        throw new Error('useConfig must be used within a ConfigProvider')
    }
    return context
}