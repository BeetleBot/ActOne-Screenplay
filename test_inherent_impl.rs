#![crate_type="lib"]
pub struct A;
mod b {
  impl super::A {
    pub fn foo() {}
  }
}
