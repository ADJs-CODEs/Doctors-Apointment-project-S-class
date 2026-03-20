import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  image: string;
  address: {
    line1: string;
    line2: string;
  };
  gender: string;
  dob: string;
  phone: string;
}


const userSchema: Schema<IUser> = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    default: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJcAAACUCAMAAACp1UvlAAAANlBMVEX///+ztbSxsrL7+/uusK/ExcXBw8Krrazv7+/y8vL39/e3ubi9v77d3t3S09Pj4+Pp6enKzMu7s83aAAAEs0lEQVR4nO2b2bakIAxFMeA8lf//s61VbZcoICeI1FrtebwPt/aKISEDIvtNiUv+C6myVG+Vii75j+FcRG039VUjhRCyqfqhaymcLZRLqbyvhK56nEgl5aJsqoVJzdCG2SyEi2gwU33IshCyAC4q9h9w9zmLADA+F/VOqkUj32R8rvEUS4gX28uYXNRKD6xZHROMx0Wd3eF1NUwnY3FR23hisS3Gs5f7IOqq27u4lI/Lf/XixH4GlxogLCF6BhjORR3gXG9Jhu8zuF4glhDVDVxUwFhCTPCXhLkUchZXNbDBUC7KGVizwVAw2F5YjFgFexjK1bKw5qgfl4smJhcaw0CuEg8SH9VxuTLP681BEsySGBfzNC4CTyTGBafGr0AHA7nO7/Q2jTHtxYxei15RubjHcY6s2A9hXC2fC7y2glycpP0/c/3odwzx+5hc9KNxIiTex+RiX3OEGGLmocy3XXIQWquBXAqtHf9xgRdplIubuMfI98KOyZWDvwPXHbyI36BNHbh+5EUKMEpw+hMcz5domcboA3AMhneaGP0vhsHwliGjz4TH/OGO/lem0EsFo/3F6q8SmIw4jV8WF1bdwj0mLlemEBcDLxIhXFnpHyz6kvUL3PmQLxgc6MO4snLycv6BZ62AOR8V5/FV5gnmj3Q6GA0YiwbNt9XkuvTUeNP+Iq7ZZFNtcbN6CFuiCNyfUCofj34mxyloGSCc671ukve1XM0mZdNPFyycXLKfo8qsmIZFU5Fds6Fzzd7QYjZa1oYu2Mz56Cquq/VwYQrkomUjbd1J+7uZ9v5DqKOF5KGs7fKpf1V1IzXV1auf8q6do9vd+VGpbiZyLp3IeqZrS2YyYnDNhup6W/45wPUdK/TjdS3N4d2LaVXT5/haH9pnyoYKb83JOYuDrgZxqYI/t+oLyGYAV9mO3C7m22hjC1yqvblUx7fVqrHztpknF6mB21nVbDb4upkfl0+R4afGsxTx4TqvMBCNXinKg8t/mdBPtY/JzrkCZi82ebQszrgoYFRl1xjKRQGTUJfqsy1NN9fVrvVVcwLm5GLtxvnK7f0uLpWH5J0zydzl/Q4uFdNai1yjPzuXKmJaa5HLYlYu4m7GIbKPZ6xcbayTuJV9zGbjYq2D4qptLmbhCliowmRbvzJzBcz9UVlmR2au2BFiK3O0MHLRPc71kXkxzMR16TXwXEYXM3BFzYommb6kgUvdEbm2MgWLI1eE++mZDGfyyIW8wblIhrB/4Lotom513JI5cN2Rro86vGPbc90cI1YdDLbngh/hXKPDQsqOK4l3LdobbM+VCEsIcnEliF2rdjX4zl53Jmxdu/Stc/GfI4RLryc1rkRB4iPd8zWuMnZl5lRp4yLuUuM10q47W65kwesjbalOs1e607hI24TfciXKQau0VeUN143FmVmDhSute+m7Txuum0p/uypl5kqMpeXuDVeam+pWnYkrudtrjv/lSnjHWbWJrBsu/hucq/QycqU+jtqB3PjX3eX/UbXJ729pqLq1qbu/XImz45ur+00u+R0abbiSXlY/XIWBK/p4g8dFv8CVP1wP18P1cD1cD9fD9XA9XKm53k80kkrb2f/V9wp/AGsCPhiMcc8UAAAAAElFTkSuQmCC",
  },
  address: {
    type: Object,
    default: { line1: '', line2: '' },
  },
  gender: {
    type: String,
    default: "Not Selected"
  },
  dob: {
    type: String,
    default: "Not Selected"
  },
  phone: {
    type: String,
    default: "0000000000"
  }
}
)

const userModel: Model<IUser> = mongoose.models.user || mongoose.model<IUser>('user', userSchema)

export default userModel