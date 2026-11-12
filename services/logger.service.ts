import fs from 'fs'

type logArgs = unknown[]
type logLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'

export const loggerService = {
    debug(...args: logArgs) {
        doLog('DEBUG', ...args)
    },
    info(...args: logArgs) {
        doLog('INFO', ...args)
    },
    warn(...args: logArgs) {
        doLog('WARN', ...args)
    },
    error(...args: logArgs) {
        doLog('ERROR', ...args)
    }
}


const logsDir: string = './logs'
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir)
}

//define the time format
function getTime() {
    const now: Date = new Date()
    return now.toLocaleString('he')
}

function isError(e: unknown): e is Error {
    return e instanceof Error || (typeof e === 'object' && e !== null && 'stack' in e && 'message' in e)
}

function doLog(level: logLevel, ...args: logArgs) {

    const strs: string[] = args.map(arg =>
        (typeof arg === 'string' || isError(arg)) ? String(arg) : JSON.stringify(arg)
    )
    const line = `${getTime()} - ${level} - ${strs.join(' | ')}\n`
    console.log(line)
    fs.appendFile('./logs/backend.log', line, (err) => {
        if (err) console.log('FATAL: cannot write to log file')
    })
}

