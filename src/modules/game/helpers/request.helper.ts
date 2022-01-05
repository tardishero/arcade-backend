import { ethers } from 'ethers';
import { Signature } from '@ethersproject/bytes';

export type RequestType = {
  maker: string;
  requester: string;
  gcToken: string;
  gameId: number;
  amount: string;
  reserved1: number;
  reserved2: number;
};

export type RequestWithSignature = RequestType & {
  v: number;
  r: string;
  s: string;
};

const EIP712DOMAIN_TYPEHASH = ethers.utils.keccak256(
  ethers.utils.toUtf8Bytes(
    'EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'
  )
);

const getDomainSeparator = (
  name: string,
  version: string,
  chainId: number,
  address: string
) => {
  return ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
      [
        EIP712DOMAIN_TYPEHASH,
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes(name)),
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes(version)),
        chainId,
        address,
      ]
    )
  );
};

class Request {
  // keccak256("Request(address maker,address requester,uint256 gameId,uint256 amount,uint256 reserved1,uint256 reserved2)")
  static REQUEST_TYPEHASH =
    '0xd32aee5345fa208c941f81688a0bd6baed57015ace9fce44cfd25c5fb8a5fbf7';

  public request: RequestType;

  constructor(
    maker: string,
    requester: string,
    gcToken: string,
    gameId: number,
    amount: string
  ) {
    this.request = {
      maker,
      requester,
      gcToken,
      gameId,
      amount,
      reserved1: 0,
      reserved2: 0,
    };
  }

  hash(overrides?: RequestType) {
    return ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        [
          'bytes32',
          'address',
          'address',
          'address',
          'uint256',
          'uint256',
          'uint256',
          'uint256',
        ],
        [
          Request.REQUEST_TYPEHASH,
          overrides?.maker || this.request.maker,
          overrides?.requester || this.request.requester,
          overrides?.gcToken || this.request.gcToken,
          overrides?.gameId || this.request.gameId,
          overrides?.amount || this.request.amount,
          overrides?.reserved1 || this.request.reserved1,
          overrides?.reserved2 || this.request.reserved2,
        ]
      )
    );
  }

  async sign(
    chainId: number,
    privateKey: string,
    verifyingContract: string,
    overrides?: RequestType
  ): Promise<Signature> {
    const DOMAIN_SEPARATOR = getDomainSeparator(
      'ArcadeSwap',
      '1',
      chainId,
      verifyingContract
    );
    const digest = ethers.utils.keccak256(
      ethers.utils.solidityPack(
        ['bytes1', 'bytes1', 'bytes32', 'bytes32'],
        ['0x19', '0x01', DOMAIN_SEPARATOR, this.hash(overrides)]
      )
    );
    const key = new ethers.utils.SigningKey(ethers.utils.hexlify(privateKey));
    const signDigest = key.signDigest.bind(key);
    const signature = ethers.utils.joinSignature(signDigest(digest));

    return ethers.utils.splitSignature(signature);
  }
}

export default Request;
