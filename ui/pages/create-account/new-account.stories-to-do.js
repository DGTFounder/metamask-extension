import React from 'react';
import { action } from '@storybook/addon-actions';
import NewAccountCreateForm from './new-account.component';

// eslint-disable-next-line import/no-anonymous-default-export
export default {
  title: 'Pages/CreateAccount/NewAccount',
};

export const DefaultStory = () => {
  return <NewAccountCreateForm createAccount={action('Account Created')} />;
};

DefaultStory.storyName = 'Default';
