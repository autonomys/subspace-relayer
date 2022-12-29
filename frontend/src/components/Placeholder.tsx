import React, { ReactElement } from 'react';

const Placeholder: React.FC = (): ReactElement => {
  return (
    <div className="placeholder">
      <div>
        <i className="fa fa-wrench fa-5" aria-hidden="true" />
      </div>
      <br />
      <h1>
        Subspace Relayer is not under active development right now. Join us on{' '}
        <a
          href="https://discord.gg/subspace-network"
          target="_blank"
          rel="noopener noreferrer"
        >
          Discord
        </a>{' '}
        to know when we are working on the new version!
      </h1>
    </div>
  );
};

export default Placeholder;
