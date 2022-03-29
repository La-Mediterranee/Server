use std::env;
use std::net::SocketAddr;
use tonic::transport::Server;
use tonic::transport::{Identity, ServerTlsConfig};

#[tokio::main]
async fn main() -> std::result::Result<(), Box<dyn std::error::Error>> {
    let mut builder = Server::builder();

    let PORT: String = env::var("PORT").expect("PORT not set");
    let addr: SocketAddr = format!("127.0.0.1:{PORT}").parse().unwrap();

    println!("{addr}");

    Ok(())
}
