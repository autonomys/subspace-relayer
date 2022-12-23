import React, { ReactElement } from 'react';

const Placeholder: React.FC = (): ReactElement => {
  return (
    <div className="placeholder">
      <div>
        <i className="fa fa-wrench fa-5" aria-hidden="true" />
      </div>
      <br />
      <h1>
        Subspace Relayer is currently being updated. Please bear with us as we
        make improvements.
      </h1>
    </div>
  );
};

export default Placeholder;
