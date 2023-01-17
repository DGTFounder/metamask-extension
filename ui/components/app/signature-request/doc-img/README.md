# Refactoring - Signature Request Pages

This document details the plan to refactor and cleanup Signature Request pages in Metamask.

The current structure of Signature Request pages look like:

1. Simple ETH Signature
   ![ETH Sign](https://raw.githubusercontent.com/MetaMask/metamask-extension/sig_req_doc/ui/components/app/signature-request/doc-img/eth_sign.png)

1. Personal Signature
   ![Personal Sign](https://raw.githubusercontent.com/MetaMask/metamask-extension/sig_req_doc/ui/components/app/signature-request/doc-img/personal_sign.png)

1. Typed Data - V1
   ![Typed Data V1 Sign](https://raw.githubusercontent.com/MetaMask/metamask-extension/sig_req_doc/ui/components/app/signature-request/doc-img/v1.png)

1. Typed Data - V3
   ![Typed Data V3 Sign](https://raw.githubusercontent.com/MetaMask/metamask-extension/sig_req_doc/ui/components/app/signature-request/doc-img/v3.png)

1. Typed Data - V4
   ![Typed Data V4 Sign](https://raw.githubusercontent.com/MetaMask/metamask-extension/sig_req_doc/ui/components/app/signature-request/doc-img/v4.png)

1. SIWE Signature
   ![SIWE Sign](https://raw.githubusercontent.com/MetaMask/metamask-extension/sig_req_doc/ui/components/app/signature-request/doc-img/siwe.png)

The current flow of control for Signature Request looks like:
![Signature Request Flow Current](https://raw.githubusercontent.com/MetaMask/metamask-extension/sig_req_doc/ui/components/app/signature-request/doc-img/signature_request_old.png)

The proposed flow of control:
![Signature Request Flow Proposed](https://raw.githubusercontent.com/MetaMask/metamask-extension/sig_req_doc/ui/components/app/signature-request/doc-img/signature_request_proposed.png)
