import * as Network from 'expo-network';
import { NetworkStatus } from '../types/data';

class NetworkService {
  private networkStatus: NetworkStatus = {
    isConnected: false,
    type: 'none',
    lastChecked: new Date().toISOString(),
  };

  private listeners: ((status: NetworkStatus) => void)[] = [];

  async init(): Promise<void> {
    await this.checkNetworkStatus();
    this.startNetworkMonitoring();
  }

  async checkNetworkStatus(): Promise<NetworkStatus> {
    try {
      const networkState = await Network.getNetworkStateAsync();
      
      this.networkStatus = {
        isConnected: networkState.isConnected,
        type: this.mapNetworkType(networkState.type),
        lastChecked: new Date().toISOString(),
      };

      this.notifyListeners();
      return this.networkStatus;
    } catch (error) {
      console.error('Error checking network status:', error);
      return this.networkStatus;
    }
  }

  private mapNetworkType(type: Network.NetworkStateType): 'wifi' | 'cellular' | 'none' {
    switch (type) {
      case Network.NetworkStateType.WIFI:
        return 'wifi';
      case Network.NetworkStateType.CELLULAR:
        return 'cellular';
      default:
        return 'none';
    }
  }

  private startNetworkMonitoring(): void {
    // Check network status every 30 seconds
    setInterval(async () => {
      await this.checkNetworkStatus();
    }, 30000);
  }

  getCurrentStatus(): NetworkStatus {
    return { ...this.networkStatus };
  }

  addListener(listener: (status: NetworkStatus) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.networkStatus);
      } catch (error) {
        console.error('Error in network status listener:', error);
      }
    });
  }

  async isConnected(): Promise<boolean> {
    const status = await this.checkNetworkStatus();
    return status.isConnected;
  }

  async hasInternetAccess(): Promise<boolean> {
    try {
      // Try to reach a reliable endpoint with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

export const networkService = new NetworkService(); 