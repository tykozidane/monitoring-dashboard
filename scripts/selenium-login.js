/* eslint-disable @typescript-eslint/no-require-imports */

const readline = require('readline')

const { Builder, By, until } = require('selenium-webdriver')

const chrome = require('selenium-webdriver/chrome')

async function run() {
  const options = new chrome.Options()
  
  options.addArguments(
    '--headless=new',
    '--window-size=1920,1080',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gcm',
    '--disable-background-networking',
    '--disable-sync',
    '--disable-notifications',
    '--disable-default-apps',
    '--disable-extensions',
    '--disable-logging',
    '--log-level=3'
  )

  options.addArguments('--start-maximized') 
  
    console.log('Open Chrome...')
  const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build()

  try {
    console.log('Logging in to Mapbox...')
    const email = 'fembinurilham@gmail.com'
    const password = await askHidden('Input Mapbox Password: ')

    await driver.get('https://account.mapbox.com/auth/signin/')

    await driver.wait(until.elementLocated(By.id('username')), 10000)
    await driver.findElement(By.id('username')).sendKeys(email)

    await driver.wait(until.elementLocated(By.id('password')), 10000)
    await driver.findElement(By.id('password')).sendKeys(password)

    await driver.findElement(By.css('[data-testid="signin-form-submit"]')).click()
    console.log('Mencoba Login...')

    const loads = await driver.wait(
      until.elementLocated(
        By.xpath(
          '//div[contains(@class,"color-gray") and normalize-space()="loads"]/preceding-sibling::div[contains(@class,"account-usage-grid-desktop")][1]'
        )
      ),
      20000
    ) 

    console.log('Usage loads:', await loads.getText())
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await driver.quit()
  }
}

function askHidden(question) {
  return new Promise(resolve => {
    const stdin = process.stdin
    const stdout = process.stdout

    stdin.resume()
    stdin.setRawMode(true)
    stdin.setEncoding('utf8')

    stdout.write(question)

    let password = ''

    const onData = char => {
      if (char === '\r' || char === '\n') {
        stdout.write('\n')
        stdin.setRawMode(false)
        stdin.pause()
        stdin.removeListener('data', onData)
        resolve(password)
      } else if (char === '\u0003') {
        // CTRL + C
        process.exit()
      } else if (char === '\u007F') {
        // Backspace
        if (password.length > 0) {
          password = password.slice(0, -1)
          stdout.write('\b \b')
        }
      } else {
        password += char
        stdout.write('*')
      }
    }

    stdin.on('data', onData)
  })
}


run()
