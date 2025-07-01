import * as SMS from 'expo-sms';
import { DonationRecord } from '../types/data';

class SMSService {
  private readonly MAX_SMS_LENGTH = 160; // Standard SMS character limit
  private readonly COMPRESSION_PREFIX = 'HK:'; // Hisaab-e-Khair prefix

  async isAvailable(): Promise<boolean> {
    return await SMS.isAvailableAsync();
  }

  async sendDonationViaSMS(donation: DonationRecord, phoneNumber: string): Promise<boolean> {
    try {
      const message = this.encodeDonationForSMS(donation);
      
      if (message.length > this.MAX_SMS_LENGTH) {
        console.warn('SMS message too long, truncating...');
        // Truncate or split into multiple messages
        return await this.sendLongMessage(message, phoneNumber);
      }

      const result = await SMS.sendSMSAsync([phoneNumber], message);
      return result.result === 'sent';
    } catch (error) {
      console.error('Error sending SMS:', error);
      return false;
    }
  }

  private async sendLongMessage(message: string, phoneNumber: string): Promise<boolean> {
    // Split long messages into chunks
    const chunks = this.splitMessageIntoChunks(message);
    
    for (const chunk of chunks) {
      try {
        const result = await SMS.sendSMSAsync([phoneNumber], chunk);
        if (result.result !== 'sent') {
          return false;
        }
        // Add delay between messages to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error('Error sending SMS chunk:', error);
        return false;
      }
    }
    
    return true;
  }

  private splitMessageIntoChunks(message: string): string[] {
    const chunks: string[] = [];
    let currentChunk = '';
    
    // Split by lines first
    const lines = message.split('\n');
    
    for (const line of lines) {
      if ((currentChunk + line + '\n').length <= this.MAX_SMS_LENGTH) {
        currentChunk += line + '\n';
      } else {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = line + '\n';
        } else {
          // Single line is too long, split by words
          const words = line.split(' ');
          for (const word of words) {
            if ((currentChunk + word + ' ').length <= this.MAX_SMS_LENGTH) {
              currentChunk += word + ' ';
            } else {
              if (currentChunk) {
                chunks.push(currentChunk.trim());
                currentChunk = word + ' ';
              } else {
                // Single word is too long, truncate
                chunks.push(word.substring(0, this.MAX_SMS_LENGTH - 3) + '...');
              }
            }
          }
        }
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }

  encodeDonationForSMS(donation: DonationRecord): string {
    // Create a compact representation of the donation
    const data = {
      id: donation.id,
      amt: donation.amount,
      cur: donation.currency,
      rec: donation.recipient,
      cat: donation.category,
      desc: donation.description || '',
      date: donation.date,
      anon: donation.isAnonymous ? 1 : 0,
    };

    // Convert to base64 for compression
    const jsonString = JSON.stringify(data);
    const base64 = btoa(jsonString);
    
    return `${this.COMPRESSION_PREFIX}${base64}`;
  }

  decodeDonationFromSMS(message: string): DonationRecord | null {
    try {
      if (!message.startsWith(this.COMPRESSION_PREFIX)) {
        return null;
      }

      const base64 = message.substring(this.COMPRESSION_PREFIX.length);
      const jsonString = atob(base64);
      const data = JSON.parse(jsonString);

      // Reconstruct the donation record
      return {
        id: data.id,
        amount: data.amt,
        currency: data.cur,
        recipient: data.rec,
        category: data.cat,
        description: data.desc || undefined,
        date: data.date,
        location: undefined, // Not included in SMS for space
        receiptImage: undefined, // Not included in SMS for space
        isAnonymous: Boolean(data.anon),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending',
      };
    } catch (error) {
      console.error('Error decoding SMS donation:', error);
      return null;
    }
  }

  async sendBatchDonations(donations: DonationRecord[], phoneNumber: string): Promise<boolean> {
    try {
      // Encode multiple donations in a single message
      const batchData = donations.map(donation => ({
        id: donation.id,
        amt: donation.amount,
        cur: donation.currency,
        rec: donation.recipient,
        cat: donation.category,
        date: donation.date,
        anon: donation.isAnonymous ? 1 : 0,
      }));

      const jsonString = JSON.stringify(batchData);
      const base64 = btoa(jsonString);
      const message = `${this.COMPRESSION_PREFIX}BATCH:${base64}`;

      if (message.length > this.MAX_SMS_LENGTH) {
        // Split donations into smaller batches
        const batchSize = Math.floor(donations.length / 2);
        const batch1 = donations.slice(0, batchSize);
        const batch2 = donations.slice(batchSize);
        
        const success1 = await this.sendBatchDonations(batch1, phoneNumber);
        const success2 = await this.sendBatchDonations(batch2, phoneNumber);
        
        return success1 && success2;
      }

      const result = await SMS.sendSMSAsync([phoneNumber], message);
      return result.result === 'sent';
    } catch (error) {
      console.error('Error sending batch SMS:', error);
      return false;
    }
  }

  decodeBatchDonations(message: string): DonationRecord[] {
    try {
      if (!message.startsWith(this.COMPRESSION_PREFIX + 'BATCH:')) {
        return [];
      }

      const base64 = message.substring((this.COMPRESSION_PREFIX + 'BATCH:').length);
      const jsonString = atob(base64);
      const batchData = JSON.parse(jsonString);

      return batchData.map((data: any) => ({
        id: data.id,
        amount: data.amt,
        currency: data.cur,
        recipient: data.rec,
        category: data.cat,
        description: undefined,
        date: data.date,
        location: undefined,
        receiptImage: undefined,
        isAnonymous: Boolean(data.anon),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending',
      }));
    } catch (error) {
      console.error('Error decoding batch SMS:', error);
      return [];
    }
  }

  // Utility method to check if a message is from our app
  isHisaabKhairMessage(message: string): boolean {
    return message.startsWith(this.COMPRESSION_PREFIX);
  }

  // Get estimated cost for SMS (approximate)
  getEstimatedSMSCost(messageLength: number): number {
    const messagesNeeded = Math.ceil(messageLength / this.MAX_SMS_LENGTH);
    // Approximate cost per SMS (varies by carrier and country)
    return messagesNeeded * 0.05; // $0.05 per SMS estimate
  }
}

export const smsService = new SMSService(); 