const deviceBundle = {
  user: {
    id: 'device-user',
    kind: 'device',
    recoverable: false,
  },
  device: {
    id: 'device-1',
    name: 'Tiko Admin web',
    secret: 'device-secret',
  },
  session: {
    token: 'device-session-token',
    expiresAt: '2099-01-01T00:00:00.000Z',
  },
}

const adminBundle = {
  user: {
    id: 'admin-user',
    displayName: 'Admin',
    kind: 'recoverable',
    recoverable: true,
  },
  device: {
    id: 'device-1',
    name: 'Tiko Admin web',
    secret: 'device-secret',
  },
  session: {
    token: 'admin-session-token',
    expiresAt: '2099-01-01T00:00:00.000Z',
  },
}

describe('admin OTP sign-in', () => {
  beforeEach(() => {
    cy.intercept('POST', 'https://identity.tikoapi.org/v1/identity/device', (req) => {
      expect(req.body).to.deep.include({
        device: {
          name: 'Tiko Admin web',
          platform: 'web',
        },
      })
      req.reply(deviceBundle)
    }).as('bootstrapDevice')

    cy.intercept('POST', 'https://identity.tikoapi.org/v1/identity/email', (req) => {
      expect(req.headers.authorization).to.equal('Bearer device-session-token')
      expect(req.body).to.deep.equal({ email: 'sil@example.com' })
      req.reply({ message: 'Check your email for the 6-digit code.' })
    }).as('requestCode')

    cy.intercept('POST', 'https://identity.tikoapi.org/v1/identity/magic-links/verify', (req) => {
      expect(req.body).to.deep.equal({ otp: '123456' })
      req.reply(adminBundle)
    }).as('verifyOtp')

    cy.intercept('GET', 'https://admin.tikoapi.org/v1/admin/me', (req) => {
      expect(req.headers.authorization).to.equal('Bearer admin-session-token')
      req.reply({
        data: {
          userId: 'admin-user',
          email: 'sil@example.com',
          role: 'admin',
        },
      })
    }).as('adminMe')

    cy.intercept('GET', 'https://admin.tikoapi.org/v1/admin/config', (req) => {
      expect(req.headers.authorization).to.equal('Bearer admin-session-token')
      req.reply({
        data: {
          appApiUrl: 'https://app.tikoapi.org/v1/apps',
          generationApiUrl: 'https://generation.tikoapi.org/v1/generation',
          mediaApiUrl: 'https://media.tikoapi.org/v1',
          communicationApiUrl: 'https://communication.tikoapi.org/v1/communication',
        },
      })
    }).as('adminConfig')
  })

  it('requests an email code, verifies the OTP, and unlocks the dashboard in the browser', () => {
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.clear()
      },
    })

    cy.contains('h1', 'Tiko Admin').should('be.visible')
    cy.contains('label', 'Email').find('input').type('Sil@Example.com')
    cy.contains('button', 'Send sign-in code').click()

    cy.wait('@bootstrapDevice')
    cy.wait('@requestCode')
    cy.contains('Check your email for the sign-in code.').should('be.visible')

    cy.contains('label', '6-digit code').find('input').type('123 456')
    cy.contains('button', 'Verify and sign in').click()

    cy.wait('@verifyOtp')
    cy.wait('@adminMe')
    cy.wait('@adminConfig')

    cy.contains('sil@example.com').should('be.visible')
    cy.contains('Images').should('be.visible')
  })
})
