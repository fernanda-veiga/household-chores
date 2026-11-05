# Application boundary

UI components call application operations defined here. DEV-51 introduces typed
repository/command ports, local operation identities, and a replaceable adapter.
Pure recurrence, dates, and capacity rules belong in `../domain`, without React,
network clients, or browser storage. This folder does not claim a working store.
