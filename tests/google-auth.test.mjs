import assert from 'node:assert/strict';
import { test } from 'node:test';
import { authDestination, googleAuthErrorMessage } from '../src/app/lib/googleAuth.ts';

test('Google sign-in preserves a protected shopping destination', () => {
  assert.equal(authDestination('/checkout?delivery=accra'), '/checkout?delivery=accra');
  assert.equal(authDestination('/dashboard/orders'), '/dashboard/orders');
});

test('Google sign-in return paths reject external and browser-normalized destinations', () => {
  for (const value of [null, {}, 'https://example.com', '//example.com', '/\\example.com', '/\n/example.com', '/ /example.com']) {
    assert.equal(authDestination(value), '/');
  }
});

test('Google sign-in errors offer the appropriate next step', () => {
  assert.match(googleAuthErrorMessage({ code: 'auth/popup-blocked' }), /Allow popups/);
  assert.match(googleAuthErrorMessage({ code: 'auth/account-exists-with-different-credential' }), /existing account method/);
  assert.match(googleAuthErrorMessage({ code: 'auth/network-request-failed' }), /internet connection/);
  assert.match(googleAuthErrorMessage({ code: 'auth/operation-not-allowed' }), /email and password/);
});
