import { Injectable } from '@nestjs/common';
import { RunJavaDto } from './dto/run-java.dto';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const MAX_CODE_LENGTH = 10000;
const MAX_OUTPUT_LENGTH = 5000;
const EXECUTION_TIMEOUT = 5000;

@Injectable()
export class CodeRunnerService {
  async runJava(runJavaDto: RunJavaDto) {
    const { code } = runJavaDto;

    // ── Validation ──
    if (!code || code.trim().length === 0) {
      return {
        success: false,
        stdout: '',
        stderr: 'No code provided',
        compileError: null,
      };
    }

    if (code.length > MAX_CODE_LENGTH) {
      return {
        success: false,
        stdout: '',
        stderr: `Code exceeds maximum length of ${MAX_CODE_LENGTH} characters`,
        compileError: null,
      };
    }

    // Extract class name
    const classMatch = code.match(/(?:public\s+)?class\s+([A-Za-z0-9_]+)/);
    if (!classMatch) {
      return {
        success: false,
        stdout: '',
        stderr: 'Could not find a valid class declaration in your code.',
        compileError: 'Expected: public class ClassName { ... }',
      };
    }
    const className = classMatch[1];

    // Basic safety: block dangerous APIs
    const blockedPatterns = [
      /Runtime\.getRuntime/,
      /ProcessBuilder/,
      /System\.exit/,
      /java\.io\.File(?!NotFoundException)/,
      /java\.net\./,
      /java\.lang\.reflect/,
    ];
    for (const pattern of blockedPatterns) {
      if (pattern.test(code)) {
        return {
          success: false,
          stdout: '',
          stderr: 'Your code uses restricted APIs',
          compileError: null,
        };
      }
    }

    // Create temporary directory in system temp
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pairpath-'));

    try {
      // Write Java file
      const mainFile = path.join(tempDir, `${className}.java`);
      await fs.writeFile(mainFile, code, 'utf-8');

      // Compile
      try {
        await execAsync(`javac ${className}.java`, {
          cwd: tempDir,
          timeout: EXECUTION_TIMEOUT,
        });
      } catch (compileErr: any) {
        return {
          success: false,
          stdout: '',
          stderr: '',
          compileError: this.truncateOutput(compileErr.stderr || compileErr.message),
        };
      }

      // Run
      try {
        const result = await execAsync(`java ${className}`, {
          cwd: tempDir,
          timeout: EXECUTION_TIMEOUT,
        });

        return {
          success: true,
          stdout: this.truncateOutput(result.stdout),
          stderr: this.truncateOutput(result.stderr),
          compileError: null,
        };
      } catch (runErr: any) {
        // Runtime error (e.g. exception, timeout)
        return {
          success: false,
          stdout: this.truncateOutput(runErr.stdout || ''),
          stderr: this.truncateOutput(runErr.stderr || runErr.message),
          compileError: null,
        };
      }
    } finally {
      // Always clean up
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {
        // Best-effort cleanup
      }
    }
  }

  private truncateOutput(output: string): string {
    if (!output) return '';
    return output.length > MAX_OUTPUT_LENGTH
      ? output.substring(0, MAX_OUTPUT_LENGTH) + '\n... [output truncated]'
      : output;
  }
}
