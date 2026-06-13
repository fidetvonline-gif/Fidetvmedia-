
// validate-channels.js
// Channel Stream Validation Script for FideTV
// Usage: node validate-channels.js

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Define __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY || '', // Set this
  TIMEOUT: 15000,
  MAX_RETRIES: 2,
  OUTPUT_DIR: './validated',
  INPUT_FILE: './channels.json'
};

// Color codes for console output
const COLORS = {
  RESET: '\x1b[0m',
  GREEN: '\x1b[32m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[36m'
};

class ChannelValidator {
  constructor() {
    this.results = {
      checked: 0,
      valid: 0,
      rejected: 0,
      newly_added: [],
      failed_channels: [],
      active_channels: [],
      deactivated: []
    };
    this.startTime = Date.now();
  }

  log(message, color = 'RESET') {
    console.log(`${COLORS[color]}${message}${COLORS.RESET}`);
  }

  // Extract YouTube channel ID from various URL formats
  extractYouTubeChannelId(url) {
    const patterns = [
      /\/c\/([A-Za-z0-9_-]+)/,
      /\/channel\/([A-Za-z0-9_-]+)/,
      /\/@([A-Za-z0-9_-]+)/,
      /\/user\/([A-Za-z0-9_-]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  // Test if YouTube channel has active live stream
  async validateYouTubeChannel(channel) {
    try {
      const startTime = Date.now();
      
      // Method 1: Check if /live page returns content
      const liveUrl = `${channel.youtube_channel_url}/live`;
      const response = await axios.get(liveUrl, {
        timeout: CONFIG.TIMEOUT,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const responseTime = Date.now() - startTime;

      // Check for live indicators in page content
      const hasLiveIndicators = 
        response.data.includes('"isLiveContent":true') ||
        response.data.includes('isLive":true') ||
        response.data.includes('Start watching now') ||
        response.data.includes('Live now');

      // Check for video unavailable
      const isUnavailable = 
        response.data.includes('Video unavailable') ||
        response.data.includes('This video is no longer available');

      // Check for geoblocking
      const isGeoblocked = 
        response.data.includes('not available') ||
        response.data.includes('your country');

      if (isUnavailable) {
        return {
          verified: false,
          status: 'video_unavailable',
          reason: 'Video not available',
          response_time_ms: responseTime
        };
      }

      if (isGeoblocked) {
        return {
          verified: false,
          status: 'geoblocked',
          reason: 'Content geoblocked',
          response_time_ms: responseTime
        };
      }

      // Method 2: Test embed URL directly
      if (channel.embed_url) {
        try {
          const embedTest = await axios.head(channel.embed_url, {
            timeout: 10000,
            maxRedirects: 3
          });

          if (embedTest.status === 200) {
            return {
              verified: true,
              status: 'active',
              has_live: hasLiveIndicators,
              response_time_ms: responseTime,
              stream_type: 'youtube',
              embed_accessible: true
            };
          }
        } catch (embedError) {
          this.log(`  [EMBED TEST FAILED] ${channel.channel_name}: ${embedError.message}`, 'YELLOW');
        }
      }

      // If page loads but no live indicators, check if it's a 24/7 stream
      if (response.status === 200) {
        return {
          verified: true,
          status: 'active',
          has_live: hasLiveIndicators,
          response_time_ms: responseTime,
          stream_type: 'youtube',
          note: 'Page accessible, live status uncertain'
        };
      }

    } catch (error) {
      return {
        verified: false,
        status: 'connection_failed',
        reason: error.message,
        response_time_ms: 0
      };
    }
  }

  // Validate HLS streams
  async validateHLSStream(channel) {
    try {
      const startTime = Date.now();
      
      // Test if URL is accessible
      const response = await axios.head(channel.live_stream_url, {
        timeout: CONFIG.TIMEOUT,
        maxRedirects: 3
      });

      if (response.status === 200) {
        // Check if it's a valid m3u8
        const contentType = response.headers['content-type'];
        const isPlaylist = contentType?.includes('m3u') || 
                          channel.live_stream_url?.includes('.m3u8');

        return {
          verified: true,
          status: 'active',
          stream_type: 'hls',
          response_time_ms: Date.now() - startTime,
          content_type: contentType,
          is_playlist: isPlaylist
        };
      }
    } catch (error) {
      return {
        verified: false,
        status: 'hls_unreachable',
        reason: error.message,
        response_time_ms: 0
      };
    }
  }

  // Main validation for a single channel
  async validateChannel(channel, index) {
    this.results.checked++;
    
    // Support different field names
    const name = channel.channel_name || channel.name;
    const url = channel.live_stream_url || channel.url;
    const ytUrl = channel.youtube_channel_url;
    const ytEmbed = channel.embed_url;

    try {
      let validation;

      // Determine validation method
      if (ytUrl) {
        validation = await this.validateYouTubeChannel(channel);
      } else if (url && url.includes('.m3u8')) {
        validation = await this.validateHLSStream({ ...channel, live_stream_url: url });
      } else if (url) {
        // Test if URL is accessible
        try {
          const response = await axios.head(url, {
            timeout: CONFIG.TIMEOUT
          });
          validation = {
            verified: response.status === 200,
            status: response.status === 200 ? 'active' : 'unreachable',
            stream_type: 'website',
            response_time_ms: 0
          };
        } catch (error) {
          validation = {
            verified: false,
            status: 'unreachable',
            reason: error.message
          };
        }
      }

      // Process result
      if (validation && validation.verified) {
        this.results.valid++;
        this.results.newly_added.push({
          name: name,
          category: channel.category,
          stream_type: validation.stream_type || 'unknown',
          url: ytUrl || url,
          embed_url: ytEmbed || null,
          status: 'active',
          verified: true,
          last_checked: new Date().toISOString(),
          response_time_ms: validation.response_time_ms || 0
        });

        this.log(
          `✓ [${index}/${this.results.checked}] ${name} - ${validation.status}`,
          'GREEN'
        );
      } else {
        this.results.rejected++;
        this.results.failed_channels.push({
          name: name,
          category: channel.category,
          reason: validation ? (validation.reason || validation.status) : 'unknown',
          status: validation ? validation.status : 'failed',
          url: ytUrl || url
        });

        this.log(
          `✗ [${index}/${this.results.checked}] ${name} - ${validation ? (validation.reason || validation.status) : 'unknown'}`,
          'RED'
        );
      }

      // Rate limiting - be respectful to servers
      await this.delay(1000);

    } catch (error) {
      this.results.rejected++;
      this.results.failed_channels.push({
        name: name,
        reason: `Validation error: ${error.message}`,
        status: 'error'
      });
      this.log(
        `✗ [${index}/${this.results.checked}] ${name} - ${error.message}`,
        'RED'
      );
    }
  }

  // Delay utility
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Load channels from JSON
  loadChannels() {
    try {
      if (!fs.existsSync(CONFIG.INPUT_FILE)) {
          this.log(`Input file ${CONFIG.INPUT_FILE} not found.`, 'YELLOW');
          return [];
      }
      const data = fs.readFileSync(CONFIG.INPUT_FILE, 'utf8');
      const json = JSON.parse(data);
      // Handle both { channels: [] } and direct [] formats
      return Array.isArray(json) ? json : (json.channels || []);
    } catch (error) {
      this.log(`Failed to load channels file: ${error.message}`, 'RED');
      return [];
    }
  }

  // Save results
  saveResults() {
    if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
      fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().split('T')[0];
    
    // Save validated channels
    const validFile = path.join(CONFIG.OUTPUT_DIR, `validated_channels_${timestamp}.json`);
    fs.writeFileSync(validFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: {
        total_checked: this.results.checked,
        valid: this.results.valid,
        rejected: this.results.rejected,
        validity_rate: `${((this.results.valid / (this.results.checked || 1)) * 100).toFixed(2)}%`
      },
      channels: this.results.newly_added
    }, null, 2));

    // Save failed channels
    const failedFile = path.join(CONFIG.OUTPUT_DIR, `failed_channels_${timestamp}.json`);
    fs.writeFileSync(failedFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      failed_count: this.results.rejected,
      channels: this.results.failed_channels
    }, null, 2));

    // Save report
    const reportFile = path.join(CONFIG.OUTPUT_DIR, `validation_report_${timestamp}.txt`);
    const report = `
CHANNEL VALIDATION REPORT
Generated: ${new Date().toISOString()}
Duration: ${((Date.now() - this.startTime) / 1000).toFixed(2)}s

SUMMARY
-------
Total Checked: ${this.results.checked}
Valid Channels: ${this.results.valid}
Rejected Channels: ${this.results.rejected}
Validity Rate: ${((this.results.valid / (this.results.checked || 1)) * 100).toFixed(2)}%

VALID CHANNELS (${this.results.valid})
${this.results.newly_added.map(c => `  ✓ ${c.name} (${c.category}) - ${c.response_time_ms}ms`).join('\n')}

FAILED CHANNELS (${this.results.rejected})
${this.results.failed_channels.map(c => `  ✗ ${c.name} - ${c.reason}`).join('\n')}

OUTPUT FILES
-----------
✓ validated_channels_${timestamp}.json - Ready for database import
✓ failed_channels_${timestamp}.json - Channels to investigate
✓ validation_report_${timestamp}.txt - This report
    `;

    fs.writeFileSync(reportFile, report);

    return {
      validated: validFile,
      failed: failedFile,
      report: reportFile
    };
  }

  // Run full validation
  async run() {
    this.log('\n╔════════════════════════════════════════╗', 'BLUE');
    this.log('║  FideTV Channel Stream Validator       ║', 'BLUE');
    this.log('╚════════════════════════════════════════╝\n', 'BLUE');

    const channels = this.loadChannels();
    
    if (channels.length === 0) {
      this.log('No channels found or input file empty/missing', 'RED');
      return;
    }

    this.log(`Loading ${channels.length} channels for validation...\n`, 'YELLOW');
    await this.delay(1000);

    // Validate each channel
    for (let i = 0; i < channels.length; i++) {
      await this.validateChannel(channels[i], i + 1);
    }

    // Save results
    this.log('\n\nSaving results...', 'BLUE');
    const files = this.saveResults();

    // Print summary
    this.log('\n╔════════════════════════════════════════╗', 'BLUE');
    this.log('║  VALIDATION COMPLETE                  ║', 'BLUE');
    this.log('╚════════════════════════════════════════╝\n', 'BLUE');

    this.log(`Total Checked: ${this.results.checked}`, 'YELLOW');
    this.log(`✓ Valid: ${this.results.valid}`, 'GREEN');
    this.log(`✗ Rejected: ${this.results.rejected}`, 'RED');
    this.log(`Validity Rate: ${((this.results.valid / (this.results.checked || 1)) * 100).toFixed(2)}%\n`, 'YELLOW');

    this.log('Output Files:', 'BLUE');
    this.log(`  → ${files.validated}`, 'GREEN');
    this.log(`  → ${files.failed}`, 'YELLOW');
    this.log(`  → ${files.report}\n`, 'BLUE');

    // Return results for programmatic use
    return this.results;
  }
}

// Main execution logic for ESM
const isMain = import.meta.url.startsWith('file:') && (process.argv[1] === fileURLToPath(import.meta.url));

if (isMain) {
  const validator = new ChannelValidator();
  validator.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export default ChannelValidator;
