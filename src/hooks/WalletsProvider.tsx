import React, {createContext, useContext, useEffect, useState} from "react"
import Web3 from 'web3'
import WalletConnectProvider from "@walletconnect/web3-provider"
import {JsonRpcPayload, JsonRpcResponse } from 'web3-core-helpers'
import {AbstractProvider} from 'web3-core/types'
import {Contract} from 'web3-eth-contract'
import {AbiItem } from 'web3-utils'
import Torus, {LOGIN_TYPE, TorusLoginParams} from '@toruslabs/torus-embed'

import {ERROS, WALLET_PROVIDERS, NETWORKS, BlockchainInfo} from '../enums'
import {useNotification, useConfig} from '.'
import {ConnectWalletsModal} from "../components"

import goBlockchainAbi from '../abis/goBlockchain.json'
import { disconnect } from "process"

declare class WalletConnectWeb3Provider
extends WalletConnectProvider implements AbstractProvider {
    sendAsync(payload: JsonRpcPayload, callback:(error: Error | null, result?: JsonRpcResponse) => void): void;
}

export type WalletProviders = 'metamask' | 'wallet-connect' | 'torus'
export type ConnectWalletInput = {
    provider: WalletProviders
    loginType?: LOGIN_TYPE
}
type ConnectWallet = (input:ConnectWalletInput) => Promise<void>
type DisconnectWallet = () => Promise<void>
type SetNewBalanceInput = {
    web3: Web3, address: string
}
type SetNewBalance = (input: SetNewBalanceInput) => Promise<void>
type GetProviderOptionsInput = {
    provider: WalletProviders,
    onCloseWalletModal?: ()=>void
    loginType?: LOGIN_TYPE
}
type GetProviderOptionsOutput = {
    web3?: Web3,
    address?: string,
    ethereumProvider?: WalletConnectProvider | any,
    torusInstance?: Torus
    error?: boolean,
    errorType?: string 
}
type GetProviderOptions = (input: GetProviderOptionsInput)=>{
    Promise<GetProviderOptionsOutput
    type GetBalanceInput = {
        web3: Web3,
        address: string
    }
}
type GetBalance = (input: GetBalanceInput) => Promise<string>
type GetContractInput = {
    web3: Web3,
    abi: AbiItem[]
    contractAddress: string
}
type GetContract = (input: GetContractInput) => Contract
type GetNftsInput = {
    contract: Contract
    address: string
}
type GetNfts = (input: GetNftsInput) => Promise<void>

interface IWalletsContext{
    connectWallet: ConnectWallet
    disconnectWallet:DisconnectWallet
    setNewBalance: SetNewBalance
    walletAddress: string
    walletBalance: string
    walletIsConnected: boolean
    walletProvider: WalletProviders
    socialLoginVerifier: LOGIN_TYPE
    goBlockchainContract: Contract
    web3: Web3
    onOpenModal: () => void
    onCloseModal: () => void
    isModalOpen: boolean
}

export const WalletsContext = createContext<IWalletsContext>({} as IWalletsContext)

export const WalletsProvider = ({children}) => {
    const [walletIsConnected, setWalletIsConnected] = useState(false)
    const [walletAddress, setWalletAddress] = useState('')
    const [walletBalance, setWalletBalance] = useState('')
    const [walletProvider, setWalletProvider] = useState<WalletProviders>('' as WalletProviders)
    const [socialLoginVerifier, setSocialLoginVerifier] = useState<LOGIN_TYPE>('' as LOGIN_TYPE)
    const [goBlockchainContract, setGoBLockchainContract] = useState<Contract>({as Contract})
    const [web3, setWeb3] = useState<Web3>({} as Web3)
    const [walletEthereumProvider, setWalletEthereumProvider] = useState<WalletConnectProvider | any>({} as WalletConnectProvider | any)
    const [torusInstance, setTorusInstance] = useState<Torus>({} as Torus)

    const {isOpen, onOpen, onClose} = useDisclosure()
    const {emitNotificationModal} = useNotification()
    const {config} = useConfig()

    useEffect(()=> {
        if(walletIsConnected === true) onClose()
    }, [walletIsConnected])

    const isValidChain = (chainId: number) => {
        let blockchain: BlockchainInfo
        if(config.networkType === 'mainnet'){
            blockchain = NETWORKS.MAINNET.find(blockchainInfo => blockchainInfo.CHAIN_ID.DECIMAL === chainId)
        } else {
            blockchain = NETWORKS.TESTNET.find(blockchainInfo => blockchainInfo.CHAIN_ID.DECIMAL === chainId)
        }
        return blockchain !== undefined && blockchain.BLOCKCHAIN === config.blockchain
    }
    const subscribeToEthereumProviderEvents = (provider: WalletConnectProvider | any): void => {
        provider.on('accountsChanged', (accounts: string[]) =>{
        debugger
        if(accounts.length === 0){
            disconnectWallet()
        } else {
            setWalletAddress(accounts[0])
        }
        })
        provider.on('chainChanged',(chainId: any) => {
            const parsedChainId = typeof chainId === 'string'? parseInt(chainId, 16): chainId
            if(!isValidChain(parsedChainId)){
                emitNotificationModal({
                    type: ERRORS.WALLETS.WRONG_NETWORK.TYPE
                    message: {
                        secondaryText: `Vocễ não está conectado à rede ${config.blockchain} ${config.networkType}`
                    }
                })
            }
        })
        provider.on('disconnect',(_:any)=> {
          disconnectWallet()  
        })
    }

    const getNetworkName = (network: string, blockchain: string ): string => {
        let networkName: string
        if(network === 'mainnet'){
            networkName = blockchain === 'ethereum' ? 'mainnet': 'matic'
        } else {
            networkName = blockchain === 'ethereum' ? 'rinkeby' : 'mumbai'
        }
        return networkName
    }
    const getProviderOptions: GetProviderOptions = async ({provider, onCloseWalletModal, loginType}) => {
        let web3: Web3
        let address: string
        let ethereumProvider: WalletConnectProvider | any
        let torusInstance: Torus
        try {
            switch(provider){
                case WALLET_PROVIDERS.METAMASK:
                    if(window.ethereum !== undefined) {
                        web3 = new Web3(window.ethereum)
                    const [metamaskAddress] = await window.ethereum.request({method:'eth_requestAccounts'})
                    address = metamaskAddress
                    ethereumProvider = window.ethereum
                    break
                    } else {
                        throw {type: ERRORS.METAMASK.INSTALLATION.TYPE}
                    }
                case WALLET_PROVIDERS.WALLET_CONNECT:
                try {
                    const WalletConnectProvider = new WalletConnectProvider({rpc:{
                        1: 'https://celo-mainnet.infura.io/v3/d6e836f1b58444189bab1f7028484051',
                        4:  'https://rinkeby.infura.io/v3/0140c9b9de0345869bfaa2e5f010eb12'
                        137: 'https://polygon-mainnet.infura.io/v3/0140c9b9de0345869bfaa2e5f010eb12', 
                        80001:'https://polygon-mumbai.infura.io/v3/0140c9b9de0345869bfaa2e5f010eb12'
                    },
                    chainId: 4
                })
                if(onCloseWalletModal !== undefined) onCloseWalletModal()
                const [walletConnectAddress] = await walletConnectProvider.enable()
                address = walletConnectAddress
                web3 = new Web3(walletConnectProvider as WalletConnectProvider)
                ethereumProvider = walletConnectProvider
                break
            } catch {
                throw { type: ERRORS.WALLET_CONNECT.MODAL_CLOSE.TYPE}
            }
            case WALLET_PROVIDERS.TORUS:
            try {
                const TorusEmbed = (await import('@toruslabs/torus-embed')).default 
                const torus = new TorusEmbed({})
                await torus.init({
                    buildEnv: 'production',
                    network: {
                        host: getNetworkName(config.networkType, config.blockchain)
                    }
                })
                torusInstance = torus
                if(onCloseWalletModal !== undefined) onCloseWalletModal()
                const loginParams: TorusLoginParams = {}
                if(loginType !== undefined)
                loginParams.verifier = loginType
                const [torusAddress] = await torus.login(loginParams)
                const torusProvider = torus.provider
                address = torusAddress
                web3 = new Web3(torusProvider as AbstractProvider)
                ethereumProvider = torusProvider
                break
            }   catch(error){
                throw {
                    type: ERRORS.TORUS.MODAL_CLOSE.TYPE
                }
            }   
        }
        return {
            web3, 
            address,
            ethereumProvider,
            torusInstance,
            error: false
        }
      } catch(error){
          if(provider === WALLET_PROVIDERS.TORUS) await torusInstance.cleanUp()
          return {error: true, errorType: error.type}
      }
    }
    const GetBalance: GetBalance = async ({web3, address}) => {
        const balance = await web3.eth.getBalance(address)
        const balanceFromWei = Web3.utils.fromWei(balance, 'ether').slice(0,6)
        return balanceFromWei
    }

    const getContract: GetContract = ({web3, abi, contractAddress}) => new web3.eth.Contract(abi, contractAddress)

    const connectWallet: ConnectWallet = async({provider, loginType}) => {
        try{
            const {address, web3, ethereumProvider, torusInstance,error, errorType = await getProviderOptions({
                provider,
                onCloseWalletModal: provider === WALLET_PROVIDERS.WALLET_CONNECT || provider === WALLET_PROVIDERS.TORUS ? onClose: undefined,
                loginType
            })
            if (error === true) throw {
                type: errorType }
                const chainId = await web3.eth.getChainId()
            if( !isValidChain(chainId)){
                throw {
                    type: ERRORS.WALLETS.WRONG_NETWORK.TYPE,
                    message: `Você não está conectado à rede ${config.blockchain} ${config.networkType}`,
                    code: ERRORS.WALLETS.WRONG_NETWORK.CODE
                }
            }
            const balance = await getBalance({web3,address})
            const goBlockchainContract = getContract({
                web3, abi: goBlockchainAbi as AbiItem[], contractAddress: config.contractAAddress
            })
            subscribeToEthereumProviderEvents(ethereumProvider)
            setWalletAddress(address)
            setWalletBalance(balance)
            setWalletProvider(provider)
            if (provider === WALLET_PROVIDERS.TORUS){
                setTorusInstance(torusInstance)
                setSocialLoginVerifier(loginType)
            }
            setGoBLockchainContract(goBlockchainContract)
            setWeb3(web3)
            setWalletEthereumProvider(ethereumProvider)
            setWalletIsConnected(true)
            if( provider !== WALLET_PROVIDERS.WALLET_CONNECT) onClose()
            } catch(error) {
                if(error.type === ERRORS.WALLET_CONNECT.MODAL_CLOSE.TYPE || error.type === ERRORS.TORUS.MODAL_CLOSE.TYPE ){
                    if(isOpen) onClose()
                } else {
                    onClose()
                    emitNotificationModal({
                        type: error.type
                        message: {
                            primaryText: 'Selecione a rede correta',
                            secondaryText: error.message !== undefined ? error.message: undefined
                        }
                    })
                }
            }
        }

        const disconnectWallet = () => {
            setWalletEthereumProvider({} as WalletConnectProvider | any)
            setWalletAddress('')
            setWalletBalance('')
            setWalletIsConnected(false)
            setWalletProvider('' as WalletProviders)
            setWeb3({} as Web3)
        }

        const disconnectWalletFromModal: DisconnectWallet = async () => {
            if(walletProvider === WALLET_PROVIDERS.WALLET_CONNECT){
                await walletEthereumProvider.disconnect()
            } 
            if(walletProvider === WALLET_PROVIDERS.TORUS){
            await torusInstance.cleanUp()
            setSocialLoginVerifier('' as LOGIN_TYPE)
            }
            disconnectWallet()
        }
        const setNewBalance: SetNewBalance = async ({web3, address}) => {
            const newBalance = await GetBalance({ web3, address})
            setWalletBalance(newBalance)
        }

        return (
            <WalletsContext.Provider value ={{
                connectWallet,
                disconnectWallet:
                disconnectWalletFromModal,
                setNewBalance,
                walletAddress,
                walletBalance,
                walletIsConnected,
                walletProvider,
                socialLoginVerifier,
                goBlockchainContract,
                web3,
                isModalOpen: isOpen,
                onCloseModal: onClose,
                onOpenModal: onOpen,
            }}>{children}
            <ConnectWalletsModal
                isOpen={isOpen}
                onClose={onClose}
                handleWalletConnet={connectWallet}
            />
            </WalletsContext.Provider>
        )
    }
    export const useWallets = () => {
        const context = useContext(WalletsContext)
        if(!context){
            throw new Error('useWallets must be used within a WalletsProvider')
        }
        return context
    }
}