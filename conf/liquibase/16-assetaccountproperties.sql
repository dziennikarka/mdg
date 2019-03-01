--liquibase formatted sql

--changeset akashihi:1
CREATE TABLE ASSET_ACCOUNT_PROPERTIES (
  ID BIGINT PRIMARY KEY,
  OPERATIONAL BOOLEAN NOT NULL DEFAULT 'f',
  FAVORITE BOOLEAN NOT NULL DEFAULT 'f'
);

INSERT INTO ASSET_ACCOUNT_PROPERTIES SELECT ID, OPERATIONAL, FAVORITE FROM ACCOUNT WHERE ACCOUNT_TYPE = 'asset';

--rollback DROP TABLE ASSET_ACCOUNT_PROPERTIES;